import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatRoundDate } from "@/lib/format";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Share2 } from "lucide-react";
import { ShareSheet } from "@/components/ShareSheet";
import { getCompetitionOg } from "@/lib/og.functions";
import { SITE_URL } from "@/lib/site";
import { emailCompetitionEntry } from "@/lib/app-email.functions";
import { fireAndForget } from "@/lib/access-token";

const GENERIC_COMP_META = [
  { title: "Competition — Majorka Racing" },
  { name: "description", content: "Rounds, entry fee, licence and car requirements — and how to enter this series." },
  { property: "og:title", content: "Competition — Majorka Racing" },
  { property: "og:description", content: "Rounds, entry fee, licence and car requirements — and how to enter this series." },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
];
import { useLang, countryName } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { HELP_OPTIONS, isRoundPast, type Round } from "@/lib/competitions";

export const Route = createFileRoute("/_app/competitions_/$slug")({
  loader: async ({ params }) => {
    try { return { og: await getCompetitionOg({ data: { slug: params.slug } }) }; } catch { return { og: null }; }
  },
  head: ({ loaderData }) => {
    const c = loaderData?.og;
    if (!c) return { meta: GENERIC_COMP_META };
    const url = `${SITE_URL}/competitions/${c.slug}`;
    const title = `${c.name} — Majorka Racing`;
    const desc = [c.discipline, c.country, c.season ? `Season ${c.season}` : null].filter(Boolean).join(" · ");
    const image = `${SITE_URL}/og.png`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:site_name", content: "Majorka Racing" },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: () => <div className="container-app py-10 text-muted-foreground">Something went wrong.</div>,
  notFoundComponent: () => <div className="container-app py-10 text-muted-foreground">Competition not found.</div>,
  component: CompetitionPage,
});

function CompetitionPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [c, setC] = useState<any | null | undefined>(undefined);
  const [entry, setEntry] = useState<{ status: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", car: "", class: "", has_licence: false, needs_help: [] as string[], message: "" });
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    supabase.from("competitions").select("*").eq("slug", slug).maybeSingle().then(({ data }) => setC(data));
  }, [slug]);

  useEffect(() => {
    if (!user || !c) return;
    supabase.from("competition_entries").select("status").eq("competition_id", c.id).eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setEntry(data));
    supabase.from("profiles").select("full_name,email,phone").eq("id", user.id).maybeSingle().then(({ data }) =>
      setF((p) => ({ ...p, full_name: data?.full_name || "", email: data?.email || user.email || "", phone: data?.phone || "" })));
  }, [user, c]);

  function onCompete() {
    if (!user) { navigate({ to: "/login" }); return; }
    setShowForm(true);
  }

  async function submit() {
    if (!user || !c) return;
    if (!f.full_name.trim() || !f.email.trim() || !f.phone.trim() || !f.car.trim()) return toast.error(t("compete.required"));
    setSaving(true);
    const { data: ins, error } = await supabase.from("competition_entries").insert({
      competition_id: c.id, user_id: user.id, full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone.trim(),
      car: f.car.trim(), class: f.class || null, has_licence: f.has_licence, needs_help: f.needs_help, message: f.message || null,
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    if (ins?.id) fireAndForget((accessToken) => emailCompetitionEntry({ data: { accessToken, entryId: ins.id } }));
    setDone(true);
    setEntry({ status: "new" });
  }

  if (c === undefined) return <div className="container-app py-10 text-muted-foreground">{t("common.loading")}</div>;
  if (!c) return <div className="container-app py-10 text-muted-foreground">{t("compete.notFound")}</div>;

  const rounds = (Array.isArray(c.rounds) ? c.rounds : []) as Round[];
  const steps = (c.how_to_enter ?? "").split(/\n+/).map((s: string) => s.trim()).filter(Boolean);
  const Info = ({ label, value }: { label: string; value?: string | null }) => value ? (
    <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm whitespace-pre-wrap">{value}</p></div>
  ) : null;

  return (
    <main className="container-app py-6 space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/competitions" className="inline-flex items-center gap-2 text-muted-foreground"><ArrowLeft size={18} /> {t("common.back")}</Link>
        <button onClick={() => setShareOpen(true)} aria-label={t("share.title")}
          className="w-10 h-10 rounded-full border border-border flex items-center justify-center"><Share2 size={16} /></button>
      </div>
      <ShareSheet open={shareOpen} onOpenChange={setShareOpen} title={c.name}
        url={`${SITE_URL}/competitions/${c.slug}`}
        text={[t("share.competitionText", { title: c.name }), c.season].filter(Boolean).join(" · ")} />
      <div className="space-y-2">
        <h1 className="text-[22px] font-semibold">{c.name}</h1>
        <div className="flex gap-2 flex-wrap items-center text-xs">
          <span className="category-pill">{c.discipline}</span>
          <span>{countryName(t, c.country)}</span>
          {c.season && <span className="text-muted-foreground">{c.season}</span>}
          {c.beginner_friendly && <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>{t("compete.beginner")}</span>}
        </div>
        {c.organiser && <p className="text-xs text-muted-foreground">{t("compete.organiser")}: {c.organiser}</p>}
      </div>
      {c.description && <p className="text-sm whitespace-pre-wrap">{c.description}</p>}

      {rounds.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-medium text-sm">{t("compete.rounds")}</h2>
          {rounds.map((r, i) => (
            <div key={i} className={`flex justify-between gap-3 text-sm ${isRoundPast(r) ? "opacity-50" : ""}`}>
              <span className="flex items-center gap-2">
                {formatRoundDate(r.date, lang)}
                {isRoundPast(r) && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">{t("compete.done")}</span>}
              </span>
              <span className="text-muted-foreground text-right">{r.venue}</span>
            </div>
          ))}
        </section>
      )}

      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <Info label={t("compete.entryFee")} value={c.entry_fee} />
        <Info label={t("compete.licence")} value={c.licence} />
        <Info label={t("compete.carReq")} value={c.car_requirements} />
      </section>

      {steps.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-medium text-sm">{t("compete.howToEnter")}</h2>
          <ol className="list-decimal pl-5 space-y-1 text-sm">{steps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
        </section>
      )}

      {(c.regulations_url || c.website || c.contact_email || c.contact_phone) && (
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2 text-sm">
          {c.regulations_url && <a href={c.regulations_url} target="_blank" rel="noopener noreferrer" className="block" style={{ color: "var(--accent)" }}>{t("compete.regulations")} →</a>}
          {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="block" style={{ color: "var(--accent)" }}>{t("compete.website")} →</a>}
          {c.contact_email && <a href={`mailto:${c.contact_email}`} className="block">{c.contact_email}</a>}
          {c.contact_phone && <a href={`tel:${c.contact_phone.replace(/\s/g, "")}`} className="block">{c.contact_phone}</a>}
        </section>
      )}

      {done ? (
        <p className="text-sm border rounded-xl p-4" style={{ borderColor: "var(--accent)" }}>{t("compete.success")}</p>
      ) : entry ? (
        <p className="text-sm border border-border rounded-xl p-4">{t("compete.alreadyApplied")} · {t(`compete.status.${entry.status}` as any)}</p>
      ) : !showForm ? (
        <button onClick={onCompete} className="cta-button">{t("compete.cta")}</button>
      ) : (
        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <Field label={t("apply.fullName") + " *"}><input className="input-field" value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
          <Field label={t("apply.email") + " *"}><input className="input-field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label={t("apply.phone") + " *"}><input className="input-field" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label={t("compete.car") + " *"}><input className="input-field" value={f.car} onChange={(e) => set("car", e.target.value)} /></Field>
          <Field label={t("compete.class")}><input className="input-field" value={f.class} onChange={(e) => set("class", e.target.value)} /></Field>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={f.has_licence} onChange={(e) => set("has_licence", e.target.checked)} />
            {t("compete.hasLicence")}
          </label>
          <Field label={t("compete.helpWith")}>
            <div className="flex flex-wrap gap-2">
              {HELP_OPTIONS.map((h) => {
                const on = f.needs_help.includes(h);
                return (
                  <button key={h} type="button" onClick={() => set("needs_help", on ? f.needs_help.filter((x) => x !== h) : [...f.needs_help, h])}
                    className="px-3 h-9 rounded-full text-xs border"
                    style={on ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}>
                    {t(`compete.help.${h}` as any)}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label={t("apply.message")}>
            <textarea className="input-field py-3" style={{ height: "auto", minHeight: 80 }} rows={3} value={f.message} onChange={(e) => set("message", e.target.value)} />
          </Field>
          <button onClick={submit} disabled={saving} className="cta-button disabled:opacity-50">{saving ? t("common.saving") : t("compete.send")}</button>
        </section>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-muted-foreground">{label}</label><div className="mt-1">{children}</div></div>;
}
