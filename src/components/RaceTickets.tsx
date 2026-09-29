import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/i18n";
import { formatDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { eur, payLabel } from "@/lib/tracks";
import { QrPass } from "@/components/QrPass";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export interface TicketType { id: string; competition_id: string; round_label: string; round_date: string | null; kind: string; name: string; price: number; capacity: number | null; sales_open: boolean }

export const raceTicketQrUrl = (code: string) => `${SITE_URL}/bookings?c=${code}`;

export function KindBadge({ kind }: { kind: string }) {
  const { t } = useLang();
  const racer = kind === "racer";
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border"
      style={racer ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)", borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}>
      {racer ? t("tickets.racer") : t("tickets.spectator")}
    </span>
  );
}

export function RaceTickets({ competitionId, competitionName }: { competitionId: string; competitionName: string }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [types, setTypes] = useState<TicketType[]>([]);
  const [left, setLeft] = useState<Record<string, number | null>>({});
  const [buying, setBuying] = useState<TicketType | null>(null);
  const [done, setDone] = useState<{ type: TicketType; id: string; code: string; status: string } | null>(null);

  const load = async () => {
    const { data } = await supabase.from("race_ticket_types").select("*").eq("competition_id", competitionId).order("round_date", { nullsFirst: false }).order("kind");
    const list = (data as any as TicketType[]) ?? [];
    setTypes(list);
    const res = await Promise.all(list.map((x) => (x.capacity != null ? supabase.rpc("race_tickets_left", { _type_id: x.id }) : Promise.resolve({ data: null }))));
    setLeft(Object.fromEntries(list.map((x, i) => [x.id, res[i].data as number | null])));
  };
  useEffect(() => { load(); }, [competitionId]);

  if (!types.length) return null;
  const rounds: { key: string; label: string; date: string | null; items: TicketType[] }[] = [];
  types.forEach((x) => {
    const key = `${x.round_label}|${x.round_date ?? ""}`;
    let r = rounds.find((r) => r.key === key);
    if (!r) rounds.push((r = { key, label: x.round_label, date: x.round_date, items: [] }));
    r.items.push(x);
  });

  if (done) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{done.type.kind === "racer" ? t("tickets.entrySent") : t("tickets.successTitle")}</h2>
        <p className="text-sm text-muted-foreground">{competitionName} · {done.type.round_label} · {done.type.name}</p>
        {done.type.kind === "racer" ? (
          <p className="text-sm border rounded-xl p-4" style={{ borderColor: "var(--accent)" }}>{t("tickets.entrySentBody")}</p>
        ) : (
          <>
            {Number(done.type.price) > 0 && <p className="text-sm">{t("slot.paymentPending")}</p>}
            <QrPass bookingId={done.id} code={done.code} url={raceTicketQrUrl(done.code)} />
          </>
        )}
        <button onClick={() => { setDone(null); load(); }} className="w-full h-11 rounded-xl border border-border text-sm">{t("common.back")}</button>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{t("tickets.title")}</h2>
      {rounds.map((r) => (
        <div key={r.key} className="space-y-2">
          <p className="text-sm font-medium">{r.label}{r.date ? <span className="text-muted-foreground"> · {formatDate(r.date, lang, "medium")}</span> : null}</p>
          {r.items.map((x) => {
            const n = left[x.id];
            const soldOut = n != null && n <= 0;
            return (
              <div key={x.id} className="bg-card border border-border rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><KindBadge kind={x.kind} /><p className="text-sm font-medium truncate">{x.name}</p></div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Number(x.price) > 0 ? eur(x.price) : t("slot.free")}
                    {n != null && ` · ${t("tickets.left", { n: Math.max(0, n) })}`}
                  </p>
                </div>
                <button disabled={!x.sales_open || soldOut}
                  onClick={() => (user ? setBuying(x) : navigate({ to: "/login", search: { redirect: window.location.pathname } }))}
                  className="shrink-0 h-10 px-4 rounded-xl text-sm font-medium disabled:opacity-40" style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>
                  {!x.sales_open ? t("tickets.closed") : soldOut ? t("common.soldOut") : t("tickets.buy")}
                </button>
              </div>
            );
          })}
        </div>
      ))}
      {buying && <BuySheet type={buying} onClose={() => setBuying(null)} onDone={(r) => { setBuying(null); setDone({ type: buying, ...r }); }} />}
    </section>
  );
}

function BuySheet({ type, onClose, onDone }: { type: TicketType; onClose: () => void; onDone: (r: { id: string; code: string; status: string }) => void }) {
  const { t } = useLang();
  const { user } = useAuth();
  const racer = type.kind === "racer";
  const [f, setF] = useState({ name: "", email: user?.email ?? "", phone: "", qty: 1, car: "", cls: "", licence: "" });
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone,email").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setF((p) => ({ ...p, name: p.name || data.full_name || "", phone: p.phone || data.phone || "", email: p.email || data.email || "" }));
    });
  }, [user]);

  async function submit() {
    if (!f.name.trim() || !f.email.trim()) return toast.error(t("slot.fillIn"));
    if (racer && !f.car.trim()) return toast.error(t("tickets.carRequired"));
    if (racer && !terms) return toast.error(t("slot.acceptTerms"));
    setBusy(true);
    const { data, error } = await supabase.rpc("buy_race_ticket", {
      _type_id: type.id, _qty: racer ? 1 : f.qty, _name: f.name.trim(), _email: f.email.trim(), _phone: f.phone.trim(),
      _car: f.car.trim(), _class: f.cls.trim(), _licence: f.licence.trim(),
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    const id = data as unknown as string;
    const { data: row } = await supabase.from("race_tickets").select("check_in_code,status").eq("id", id).maybeSingle();
    setBusy(false);
    onDone({ id, code: row?.check_in_code ?? "", status: row?.status ?? "reserved" });
  }

  const inp = (k: keyof typeof f, label: string, type = "text") => (
    <label className="block text-xs text-muted-foreground">{label}<input className="input-field mt-1" type={type} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  );
  return (
    <Drawer open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <DrawerHeader className="text-left"><DrawerTitle>{type.name}</DrawerTitle></DrawerHeader>
        <div className="px-4 pb-8 space-y-3 max-h-[75vh] overflow-y-auto">
          {inp("name", t("auth.signup.fullName"))}
          {inp("email", t("auth.email"), "email")}
          {inp("phone", t("auth.signup.phone"), "tel")}
          {racer ? (
            <>
              {inp("car", `${t("compete.car")} *`)}
              {inp("cls", t("compete.class"))}
              {inp("licence", t("tickets.licenceNo"))}
            </>
          ) : (
            <label className="block text-xs text-muted-foreground">{t("tickets.quantity")}
              <select className="input-field mt-1" value={f.qty} onChange={(e) => setF({ ...f, qty: Number(e.target.value) })}>
                {Array.from({ length: 10 }).map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
              </select>
            </label>
          )}
          <p className="text-sm flex justify-between"><span>{t("slot.total")}</span><span className="font-semibold">{Number(type.price) > 0 ? eur(Number(type.price) * (racer ? 1 : f.qty)) : t("slot.free")}</span></p>
          {Number(type.price) > 0 && <p className="text-xs text-muted-foreground">{payLabel(t, "pending")}</p>}
          {racer && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
              <span>{t("slot.agree")} <Link to="/event-terms" target="_blank" className="text-accent underline">{t("eventTerms.title")}</Link></span>
            </label>
          )}
          <button onClick={submit} disabled={busy} className="w-full h-12 rounded-xl text-sm font-semibold disabled:opacity-60" style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>
            {busy ? t("common.saving") : racer ? t("tickets.sendEntry") : t("tickets.reserve")}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
