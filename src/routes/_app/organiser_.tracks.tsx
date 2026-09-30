import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLang, countryName } from "@/i18n";
import { useOrganiserGuard } from "@/lib/roles";
import { COUNTRIES } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import { ImageCropModal } from "@/components/ImageCropModal";
import { PlaceSearch } from "@/components/PlaceSearch";
import { SlotCalendar } from "@/components/SlotCalendar";
import { calcPrice, dayName, eur, hhmm, payLabel, VENUE_REQS, type PriceRule, type Slot } from "@/lib/tracks";

const LocationPickerMap = lazy(() => import("@/components/LocationPickerMap"));

export const Route = createFileRoute("/_app/organiser_/tracks")({
  head: () => ({ meta: [
    { title: "My tracks — Majorka Racing" },
    { name: "description", content: "Manage your track, hourly prices and bookable slots." },
    { property: "og:title", content: "My tracks — Majorka Racing" },
    { property: "og:description", content: "Manage your track, hourly prices and bookable slots." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MyTracks,
});

const primary = { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" };

function MyTracks() {
  const { user } = useAuth();
  const { t } = useLang();
  const { isAdmin } = useOrganiserGuard(t("organiser.notAllowed"));
  const [venues, setVenues] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [managing, setManaging] = useState<any | null>(null);

  const load = () => {
    if (!user) return;
    let q = supabase.from("venues").select("*").order("created_at", { ascending: false });
    if (!isAdmin) q = q.eq("owner_id", user.id);
    q.then(({ data }) => setVenues(data ?? []));
  };
  useEffect(load, [user, isAdmin]);

  if (editing) return <VenueEditor venue={editing} onDone={() => { setEditing(null); load(); }} />;
  if (managing) return <SlotsManager venue={managing} onBack={() => setManaging(null)} />;

  return (
    <main className="container-app py-6 space-y-4">
      <Link to="/organiser" className="inline-flex items-center gap-2 text-muted-foreground"><ArrowLeft size={18} /> {t("common.back")}</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-semibold">{t("mytracks.title")}</h1>
        <button onClick={() => setEditing({})} className="inline-flex items-center gap-1 px-3 h-10 rounded-xl text-sm font-medium" style={primary}><Plus size={16} /> {t("mytracks.add")}</button>
      </div>
      {venues.length === 0 ? <p className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">{t("mytracks.empty")}</p> : venues.map((v) => (
        <div key={v.id} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-3 flex justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium truncate">{v.name}</p>
              <p className="text-xs text-muted-foreground">{[v.city, v.country].filter(Boolean).join(" · ")}</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 h-fit rounded-full bg-input">{v.status === "live" ? t("organiser.status.live") : t("organiser.status.draft")}</span>
          </div>
          <div className="grid grid-cols-3 border-t border-border text-xs">
            <button onClick={() => setManaging(v)} className="py-3 border-r border-border">{t("mytracks.slots")}</button>
            <button onClick={() => setEditing(v)} className="py-3 border-r border-border">{t("common.edit")}</button>
            <Link to="/tracks/$slug" params={{ slug: v.slug }} className="py-3 text-center">{t("mytracks.view")}</Link>
          </div>
        </div>
      ))}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-muted-foreground">{label}</label><div className="mt-1">{children}</div></div>;
}

function VenueEditor({ venue, onDone }: { venue: any; onDone: () => void }) {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [f, setF] = useState({
    name: venue.name ?? "", country: venue.country ?? "Latvia", city: venue.city ?? "", location_name: venue.location_name ?? "",
    location_lat: venue.location_lat ?? null as number | null, location_lng: venue.location_lng ?? null as number | null,
    description: venue.description ?? "", track_info: venue.track_info ?? "", website: venue.website ?? "", phone: venue.phone ?? "",
    email: venue.email ?? "", requirements: (venue.requirements ?? []) as string[], status: venue.status ?? "draft",
  });
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [cover, setCover] = useState<string | null>(venue.cover_image_url ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: any) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!venue.id) { setRules([{ days: [1, 2, 3, 4, 5], start_time: "09:00", end_time: "20:00", price_per_hour: 200, label: null }]); return; }
    supabase.from("venue_price_rules").select("*").eq("venue_id", venue.id).order("start_time").then(({ data }) => setRules((data as any) ?? []));
  }, [venue.id]);

  function pickCover() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => { const file = input.files?.[0]; if (file) setCropSrc(URL.createObjectURL(file)); };
    input.click();
  }

  async function save() {
    if (!user || !f.name.trim()) return toast.error(t("organiser.post.required"));
    if (f.status === "live" && (f.location_lat == null || f.location_lng == null)) return toast.error(t("organiser.post.pinRequired"));
    setBusy(true);
    let coverUrl = cover;
    if (coverFile) {
      const path = `${user.id}/venue-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("event-covers").upload(path, coverFile);
      if (!error) coverUrl = supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl;
    }
    const payload = {
      ...f, name: f.name.trim(), cover_image_url: coverUrl,
      location_lat: f.location_lat, location_lng: f.location_lng,
      city: f.city || null, location_name: f.location_name || null, description: f.description || null, track_info: f.track_info || null,
      website: f.website || null, phone: f.phone || null, email: f.email || null,
    };
    const res = venue.id
      ? await supabase.from("venues").update(payload).eq("id", venue.id).select("id").single()
      : await supabase.from("venues").insert({ ...payload, owner_id: user.id, slug: `${f.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Math.random().toString(36).slice(2, 6)}` }).select("id").single();
    if (res.error) { setBusy(false); return toast.error(res.error.message); }
    const vid = res.data.id;
    await supabase.from("venue_price_rules").delete().eq("venue_id", vid);
    const valid = rules.filter((r) => r.days.length && r.start_time && r.end_time && r.start_time < r.end_time);
    if (valid.length) {
      const { error } = await supabase.from("venue_price_rules").insert(valid.map((r) => ({ venue_id: vid, days: r.days, start_time: r.start_time, end_time: r.end_time, price_per_hour: Number(r.price_per_hour) || 0, label: r.label || null })));
      if (error) toast.error(error.message);
    }
    setBusy(false);
    toast.success(t("mytracks.saved"));
    onDone();
  }

  const updRule = (i: number, patch: Partial<PriceRule>) => setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <main className="container-app py-6 space-y-4 pb-32">
      <button onClick={onDone} className="inline-flex items-center gap-2 text-muted-foreground"><ArrowLeft size={18} /> {t("common.back")}</button>
      <h1 className="text-[22px] font-semibold">{venue.id ? t("mytracks.edit") : t("mytracks.add")}</h1>
      <Field label={t("mytracks.name")}><input className="input-field" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("organiser.post.country")}>
          <select className="input-field" value={f.country} onChange={(e) => set("country", e.target.value)}>
            {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{countryName(t, c.value)}</option>)}
          </select>
        </Field>
        <Field label={t("organiser.post.city")}><input className="input-field" value={f.city} onChange={(e) => set("city", e.target.value)} /></Field>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">{t("organiser.post.mapLocation")}</label>
        <PlaceSearch initial={f.location_name} onText={(v) => set("location_name", v)}
          onPick={(p) => setF((x) => ({ ...x, location_name: p.label, city: p.city || x.city, country: p.country ?? x.country, location_lat: p.lat, location_lng: p.lng }))} />
        <ClientOnly fallback={<div className="h-56 rounded-xl border border-border" />}>
          <Suspense fallback={<div className="h-56 rounded-xl border border-border" />}>
            <LocationPickerMap lat={f.location_lat} lng={f.location_lng} onChange={(lat, lng) => setF((x) => ({ ...x, location_lat: lat, location_lng: lng }))} />
          </Suspense>
        </ClientOnly>
      </div>
      <Field label={t("organiser.post.description")}><textarea className="input-field py-3" style={{ height: "auto" }} rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label={t("tracks.trackInfo")}><textarea className="input-field py-3" style={{ height: "auto" }} rows={3} placeholder={t("mytracks.trackInfoPh")} value={f.track_info} onChange={(e) => set("track_info", e.target.value)} /></Field>
      <div className="grid grid-cols-1 gap-3">
        <Field label={t("auth.signup.phone")}><input className="input-field" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
      </div>
      <Field label={t("mytracks.bookingEmails")}><input className="input-field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
      <p className="text-xs text-muted-foreground -mt-2">{t("mytracks.bookingEmailsHint")}</p>
      <Field label={t("tracks.website")}><input className="input-field" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
      <div>
        <p className="text-xs text-muted-foreground mb-2">{t("organiser.post.requirements")}</p>
        <div className="flex flex-wrap gap-2">
          {VENUE_REQS.map((k) => {
            const on = f.requirements.includes(k);
            return <button key={k} type="button" onClick={() => set("requirements", on ? f.requirements.filter((x) => x !== k) : [...f.requirements, k])}
              className={`rounded-full border px-3 py-2 text-xs ${on ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"}`}>{t(`req.${k}`)}</button>;
          })}
        </div>
      </div>
      <Field label={t("organiser.post.cover")}>
        <button type="button" onClick={pickCover} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 w-full text-left">
          {cover ? <img src={cover} alt="" className="w-16 h-16 rounded-lg object-cover" /> : <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-input"><Upload size={20} className="text-muted-foreground" /></div>}
          <span className="text-sm text-muted-foreground">{cover ? t("organiser.post.replaceCover") : t("organiser.post.uploadCover")}</span>
        </button>
      </Field>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">{t("tracks.prices")}</h2>
        {rules.map((r, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-3 space-y-2">
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const on = r.days.includes(d);
                return <button key={d} type="button" onClick={() => updRule(i, { days: on ? r.days.filter((x) => x !== d) : [...r.days, d].sort() })}
                  className={`h-8 px-2.5 rounded-full border text-xs ${on ? "border-accent bg-accent text-accent-foreground" : "border-border"}`}>{dayName(d, lang)}</button>;
              })}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input className="input-field" type="time" aria-label={t("mytracks.from")} value={hhmm(r.start_time)} onChange={(e) => updRule(i, { start_time: e.target.value })} />
              <input className="input-field" type="time" aria-label={t("mytracks.to")} value={hhmm(r.end_time)} onChange={(e) => updRule(i, { end_time: e.target.value })} />
              <input className="input-field" type="number" min={0} aria-label={t("mytracks.pricePerHour")} placeholder="€/h" value={r.price_per_hour} onChange={(e) => updRule(i, { price_per_hour: Number(e.target.value) })} />
            </div>
            <div className="flex gap-2">
              <input className="input-field" placeholder={t("mytracks.ruleLabel")} value={r.label ?? ""} onChange={(e) => updRule(i, { label: e.target.value })} />
              <button type="button" aria-label={t("mytracks.removeRule")} onClick={() => setRules((rs) => rs.filter((_, j) => j !== i))} className="h-12 w-12 shrink-0 rounded-xl border border-border inline-flex items-center justify-center"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        <button type="button" className="text-sm text-accent" onClick={() => setRules((rs) => [...rs, { days: [6, 7], start_time: "09:00", end_time: "20:00", price_per_hour: 250, label: null }])}>{t("mytracks.addRule")}</button>
      </section>

      <Field label={t("mytracks.status")}>
        <div className="flex gap-2">
          {(["draft", "live"] as const).map((s) => (
            <button key={s} type="button" onClick={() => set("status", s)} className="flex-1 h-10 rounded-xl border text-sm"
              style={f.status === s ? { ...primary, borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}>{t(`organiser.status.${s}`)}</button>
          ))}
        </div>
      </Field>
      <button onClick={save} disabled={busy} className="w-full h-14 rounded-xl text-sm font-semibold" style={primary}>{busy ? t("common.saving") : t("common.save")}</button>
      {cropSrc && <ImageCropModal imageSrc={cropSrc} aspectRatio={16 / 9}
        onConfirm={(blob) => { setCoverFile(new File([blob], "cover.jpg", { type: "image/jpeg" })); setCover(URL.createObjectURL(blob)); URL.revokeObjectURL(cropSrc); setCropSrc(null); }}
        onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }} />}
    </main>
  );
}

function SlotsManager({ venue, onBack }: { venue: any; onBack: () => void }) {
  const { t, lang } = useLang();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editSlot, setEditSlot] = useState<Slot | null>(null);

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("venue_slots").select("*").eq("venue_id", venue.id).gte("date", today).order("date").order("start_time"),
      supabase.from("venue_price_rules").select("*").eq("venue_id", venue.id),
    ]);
    setSlots((s as any) ?? []); setRules((r as any) ?? []);
  };
  useEffect(() => { load(); }, [venue.id]);

  async function cancelSlot(s: Slot) {
    if (!confirm(t("mytracks.cancelSlotPrompt"))) return;
    const { error } = await supabase.from("venue_slots").update({ status: "cancelled" }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(t("mytracks.slotCancelled")); load();
  }

  const list = day ? slots.filter((s) => s.date === day) : slots.slice(0, 30);
  return (
    <main className="container-app py-6 space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-muted-foreground"><ArrowLeft size={18} /> {t("common.back")}</button>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-[20px] font-semibold truncate">{venue.name}</h1>
        <button onClick={() => { setEditSlot(null); setAdding(true); }} className="shrink-0 inline-flex items-center gap-1 px-3 h-10 rounded-xl text-sm font-medium" style={primary}><Plus size={16} /> {t("mytracks.addSlots")}</button>
      </div>
      {(adding || editSlot) && <SlotForm venueId={venue.id} rules={rules} slot={editSlot} defaultDate={day} onDone={() => { setAdding(false); setEditSlot(null); load(); }} />}
      <SlotCalendar slots={slots} selected={day} onSelect={(d) => setDay(d === day ? null : d)} />
      {list.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">{t("tracks.noSlotsDay")}</p> : list.map((s) => (
        <div key={s.id} className="bg-card border border-border rounded-2xl overflow-hidden">
          <button onClick={() => setOpen(open === s.id ? null : s.id)} className="w-full p-3 flex justify-between gap-2 text-left">
            <span>
              <span className="font-medium">{formatDate(s.date, lang, "weekdayShort")} · {hhmm(s.start_time)}–{hhmm(s.end_time)}</span>
              <span className="block text-xs text-muted-foreground">{t("slot.carsRange", { min: s.min_cars, max: s.max_cars })}</span>
            </span>
            <span className="text-right text-sm"><span className="font-medium">{eur(s.price_total)}</span><span className="block text-xs text-muted-foreground">{t(`slot.status.${s.status}` as any)}</span></span>
          </button>
          {s.status === "open" && (
            <div className="grid grid-cols-2 border-t border-border text-xs">
              <button onClick={() => { setAdding(false); setEditSlot(s); }} className="py-2.5 border-r border-border">{t("common.edit")}</button>
              <button onClick={() => cancelSlot(s)} className="py-2.5" style={{ color: "var(--accent)" }}>{t("mytracks.cancelSlot")}</button>
            </div>
          )}
          {open === s.id && <SlotBookings slotId={s.id} />}
        </div>
      ))}
    </main>
  );
}

function SlotForm({ venueId, rules, slot, defaultDate, onDone }: { venueId: string; rules: PriceRule[]; slot: Slot | null; defaultDate: string | null; onDone: () => void }) {
  const { t } = useLang();
  const [f, setF] = useState({
    date: slot?.date ?? defaultDate ?? "", from: hhmm(slot?.start_time) || "10:00", to: hhmm(slot?.end_time) || "12:00",
    min: slot?.min_cars ?? 4, max: slot?.max_cars ?? 10, price: slot ? String(slot.price_total) : "", notes: slot?.notes ?? "", weeks: 0,
  });
  const [touched, setTouched] = useState(!!slot);
  const auto = calcPrice(rules, f.date, f.from, f.to);
  useEffect(() => { if (!touched && auto != null) setF((p) => ({ ...p, price: String(auto) })); }, [auto, touched]);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!f.date || !f.from || !f.to || f.from >= f.to || !f.price || f.min < 1 || f.max < f.min) return toast.error(t("mytracks.slotInvalid"));
    setBusy(true);
    const base = { venue_id: venueId, start_time: f.from, end_time: f.to, min_cars: f.min, max_cars: f.max, price_total: Number(f.price), per_spot_price: Math.ceil((Number(f.price) / f.max) * 100) / 100, notes: f.notes || null };
    let error;
    if (slot) ({ error } = await supabase.from("venue_slots").update({ ...base, date: f.date }).eq("id", slot.id));
    else {
      const rows = Array.from({ length: f.weeks + 1 }).map((_, i) => {
        const d = new Date(`${f.date}T00:00:00`); d.setDate(d.getDate() + i * 7);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return { ...base, date: ds, status: "open" };
      });
      ({ error } = await supabase.from("venue_slots").insert(rows));
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("mytracks.slotsSaved"));
    onDone();
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <Field label={t("organiser.post.date")}><input className="input-field" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("mytracks.from")}><input className="input-field" type="time" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
        <Field label={t("mytracks.to")}><input className="input-field" type="time" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        <Field label={t("mytracks.minCars")}><input className="input-field" type="number" min={1} value={f.min} onChange={(e) => setF({ ...f, min: Number(e.target.value) })} /></Field>
        <Field label={t("mytracks.maxCars")}><input className="input-field" type="number" min={1} value={f.max} onChange={(e) => setF({ ...f, max: Number(e.target.value) })} /></Field>
      </div>
      <Field label={t("mytracks.priceTotal")}>
        <input className="input-field" type="number" min={0} step="0.01" value={f.price} onChange={(e) => { setTouched(true); setF({ ...f, price: e.target.value }); }} />
      </Field>
      <p className="text-[11px] text-muted-foreground">{auto != null ? t("mytracks.autoPrice", { price: eur(auto) }) : t("mytracks.noRule")}</p>
      <Field label={t("mytracks.notes")}><input className="input-field" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      {!slot && (
        <Field label={t("mytracks.repeat")}>
          <select className="input-field" value={f.weeks} onChange={(e) => setF({ ...f, weeks: Number(e.target.value) })}>
            {Array.from({ length: 13 }).map((_, i) => <option key={i} value={i}>{i === 0 ? t("mytracks.noRepeat") : t("mytracks.weeks", { n: i })}</option>)}
          </select>
        </Field>
      )}
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 h-11 rounded-xl border border-border text-sm">{t("common.cancel")}</button>
        <button onClick={save} disabled={busy} className="flex-1 h-11 rounded-xl text-sm font-semibold" style={primary}>{busy ? t("common.saving") : t("common.save")}</button>
      </div>
    </div>
  );
}

function SlotBookings({ slotId }: { slotId: string }) {
  const { t } = useLang();
  const [rows, setRows] = useState<any[]>([]);
  const [code, setCode] = useState("");
  useEffect(() => { supabase.from("slot_bookings").select("*").eq("slot_id", slotId).order("created_at").then(({ data }) => setRows(data ?? [])); }, [slotId]);
  const q = code.trim().toLowerCase();
  const match = q.length >= 4 ? rows.find((r) => r.check_in_code?.toLowerCase() === q && r.status !== "cancelled") : null;
  return (
    <div className="border-t border-border p-3 space-y-2">
      {rows.length === 0 ? <p className="text-xs text-muted-foreground">{t("mytracks.noBookings")}</p> : (
        <>
          <input className="input-field h-10" placeholder={t("mytracks.checkCode")} value={code} onChange={(e) => setCode(e.target.value)} />
          {q.length >= 4 && <p className="text-xs font-medium" style={{ color: match ? "var(--success)" : "var(--accent)" }}>{match ? t("mytracks.codeOk", { name: match.attendee_name, n: match.spots }) : t("mytracks.codeBad")}</p>}
          {rows.map((b) => (
            <div key={b.id} className="text-xs border border-border rounded-xl p-2.5" style={match?.id === b.id ? { borderColor: "var(--success)" } : undefined}>
              <p className="font-medium text-sm">{b.attendee_name}{b.is_host ? ` · ${t("slot.host")}` : ""}</p>
              <p className="text-muted-foreground">{[b.attendee_phone, b.attendee_email].filter(Boolean).join(" · ")}</p>
              <p>{t(`slot.kind.${b.kind}` as any)} · {t("slot.spotsN", { n: b.spots })} · {eur(b.amount)} · {t(`slot.bstatus.${b.status}` as any)} · {payLabel(t, b.payment_status)}</p>
              <p className="font-mono text-muted-foreground">{b.check_in_code?.toUpperCase()}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
