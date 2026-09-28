import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useLang, catLabel } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES } from "@/lib/categories";
import { COUNTRIES } from "@/lib/countries";
import { emailOrganiserApplication } from "@/lib/app-email.functions";

export const Route = createFileRoute("/_app/organiser_/apply")({
  head: () => ({ meta: [
    { title: "Become an organiser — Majorka Racing" },
    { name: "description", content: "Apply to list your track days and drift events on Majorka Racing." },
    { property: "og:title", content: "Become an organiser — Majorka Racing" },
    { property: "og:description", content: "Apply to list your track days and drift events on Majorka Racing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ApplyPage,
});

const TYPES = ["track_owner", "organiser", "club"] as const;
const PER_YEAR = ["1-3", "4-10", "10+"] as const;

function ApplyPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [f, setF] = useState({
    full_name: "", email: "", phone: "", organiser_type: "organiser", company: "", registration_no: "",
    country: COUNTRIES[0].value as string, city: "", venues: "", event_types: [] as string[], events_per_year: "",
    website: "", socials: "", experience: "", message: "",
  });
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/login" }); return; }
    if (!user) return;
    supabase.from("profiles").select("full_name,email,phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      setF((p) => ({ ...p, full_name: data?.full_name || p.full_name, email: data?.email || user.email || "", phone: data?.phone || "" }));
    });
  }, [user, loading, navigate]);

  async function submit() {
    if (!user) return;
    if (!f.full_name.trim() || !f.email.trim() || !f.phone.trim() || !f.country || !f.venues.trim() || f.event_types.length === 0 || !confirm) {
      return toast.error(t("apply.required"));
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("organiser_applications").insert({
      user_id: user.id, full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone.trim(),
      organiser_type: f.organiser_type, company: f.company || null, registration_no: f.registration_no || null,
      country: f.country, city: f.city || null, venues: f.venues, event_types: f.event_types,
      events_per_year: f.events_per_year || null, website: f.website || null, socials: f.socials || null,
      experience: f.experience || null, message: f.message || null,
    }).select("id").single();
    if (error || !data) { setSubmitting(false); return toast.error(error?.message ?? "Error"); }
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (token) void emailOrganiserApplication({ data: { type: "new_application", applicationId: data.id, accessToken: token } }).catch(() => {});
    } catch { /* silent */ }
    setSubmitting(false);
    setDone(true);
  }

  if (done) {
    return (
      <main className="container-app py-10 space-y-4 text-center">
        <h1 className="text-[22px] font-semibold">{t("apply.thanksTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("apply.thanksBody")}</p>
        <Link to="/profile" className="cta-button">{t("apply.backToProfile")}</Link>
      </main>
    );
  }

  const cats = CATEGORIES.filter((c) => c.value !== "majorka_special");

  return (
    <main className="container-app py-6 space-y-5">
      <button onClick={() => navigate({ to: "/profile" })} className="inline-flex items-center gap-2 text-muted-foreground">
        <ArrowLeft size={18} /> {t("common.back")}
      </button>
      <div>
        <h1 className="text-[22px] font-semibold">{t("apply.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("apply.subtitle")}</p>
      </div>
      <div className="space-y-3">
        <F label={t("apply.fullName") + " *"}><input className="input-field" value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></F>
        <F label={t("apply.email") + " *"}><input className="input-field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></F>
        <F label={t("apply.phone") + " *"}><input className="input-field" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></F>
        <F label={t("apply.type") + " *"}>
          <select className="input-field" value={f.organiser_type} onChange={(e) => set("organiser_type", e.target.value)}>
            {TYPES.map((v) => <option key={v} value={v}>{t(`apply.type.${v}` as any)}</option>)}
          </select>
        </F>
        <F label={t("apply.company")}><input className="input-field" value={f.company} onChange={(e) => set("company", e.target.value)} /></F>
        <F label={t("apply.regNo")}><input className="input-field" value={f.registration_no} onChange={(e) => set("registration_no", e.target.value)} /></F>
        <F label={t("apply.country") + " *"}>
          <select className="input-field" value={f.country} onChange={(e) => set("country", e.target.value)}>
            {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </F>
        <F label={t("apply.city")}><input className="input-field" value={f.city} onChange={(e) => set("city", e.target.value)} /></F>
        <F label={t("apply.venues") + " *"}><input className="input-field" value={f.venues} onChange={(e) => set("venues", e.target.value)} /></F>
        <F label={t("apply.eventTypes") + " *"}>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const on = f.event_types.includes(c.value);
              return (
                <button key={c.value} type="button"
                  onClick={() => set("event_types", on ? f.event_types.filter((x) => x !== c.value) : [...f.event_types, c.value])}
                  className="px-3 h-9 rounded-full text-xs border"
                  style={on ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}>
                  {catLabel(t, c.value)}
                </button>
              );
            })}
          </div>
        </F>
        <F label={t("apply.perYear")}>
          <select className="input-field" value={f.events_per_year} onChange={(e) => set("events_per_year", e.target.value)}>
            <option value="">—</option>
            {PER_YEAR.map((v) => <option key={v} value={v}>{v === "1-3" ? "1–3" : v === "4-10" ? "4–10" : v}</option>)}
          </select>
        </F>
        <F label={t("apply.website")}><input className="input-field" value={f.website} onChange={(e) => set("website", e.target.value)} /></F>
        <F label={t("apply.socials")}><input className="input-field" value={f.socials} onChange={(e) => set("socials", e.target.value)} /></F>
        <F label={t("apply.experience")}>
          <textarea className="input-field py-3" style={{ height: "auto", minHeight: 96 }} rows={4}
            placeholder={t("apply.experienceHint")} value={f.experience} onChange={(e) => set("experience", e.target.value)} />
        </F>
        <F label={t("apply.message")}>
          <textarea className="input-field py-3" style={{ height: "auto", minHeight: 80 }} rows={3}
            value={f.message} onChange={(e) => set("message", e.target.value)} />
        </F>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          <span>{t("apply.confirm")} *</span>
        </label>
      </div>
      <button onClick={submit} disabled={submitting} className="cta-button disabled:opacity-50">
        {submitting ? t("common.saving") : t("apply.submit")}
      </button>
    </main>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-muted-foreground">{label}</label><div className="mt-1">{children}</div></div>;
}
