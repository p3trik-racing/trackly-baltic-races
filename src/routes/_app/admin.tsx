import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDate } from "@/lib/format";
import { categoryLabel } from "@/lib/categories";
import { useCallback, useEffect, useRef, useState } from "react";
import { codeFromScan } from "@/lib/tracks";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRoles } from "@/lib/roles";
import { emailOrganiserApplication, emailOrganiserRole } from "@/lib/app-email.functions";
import { cancelEventWithNotifications } from "@/lib/cancel-event.functions";
import { ImageCropModal } from "@/components/ImageCropModal";

function Ratings() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<any[]>([]);
  useEffect(() => {
    supabase.rpc("admin_organiser_ratings").then(({ data, error }) => {
      if (error) toast.error(error.message);
      setRows([...(data ?? [])].sort((a: any, b: any) => Number(b.avg_stars) - Number(a.avg_stars)));
    });
  }, []);
  async function openOrg(id: string) {
    if (open === id) return setOpen(null);
    setOpen(id); setDetail([]);
    const { data: evs } = await supabase.from("events").select("id,title,date").eq("organiser_id", id).order("date", { ascending: false });
    const ids = (evs ?? []).map((e) => e.id);
    const { data: rs } = ids.length ? await supabase.from("event_ratings").select("event_id,stars,comment").in("event_id", ids) : { data: [] as any[] };
    setDetail((evs ?? []).map((e) => ({ ...e, ratings: (rs ?? []).filter((r: any) => r.event_id === e.id) })).filter((e) => e.ratings.length));
  }
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No ratings yet.</p>}
      {rows.map((r) => (
        <div key={r.organiser_id} className="bg-card border border-border rounded-2xl p-3 space-y-2">
          <button onClick={() => openOrg(r.organiser_id)} className="w-full flex items-center justify-between gap-2 text-left">
            <span className="text-sm font-medium">{r.organiser_name || r.organiser_id.slice(0, 8)}</span>
            <span className="text-xs">★ {Number(r.avg_stars).toFixed(1)} · {r.ratings} ratings · {r.events_rated} events{r.last_event ? ` · last ${formatDate(r.last_event, "en")}` : ""}</span>
          </button>
          {open === r.organiser_id && detail.map((e) => {
            const avg = e.ratings.reduce((s: number, x: any) => s + x.stars, 0) / e.ratings.length;
            return (
              <div key={e.id} className="border-t border-border pt-2 text-xs space-y-1">
                <p className="font-medium">{e.title} · {formatDate(e.date, "en")} · ★ {avg.toFixed(1)} ({e.ratings.length})</p>
                {e.ratings.filter((x: any) => x.comment).map((x: any, i: number) => <p key={i} className="text-muted-foreground">★{x.stars} — {x.comment}</p>)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [
    { title: "Admin — Majorka Racing" },
    { name: "description", content: "Majorka Racing admin panel." },
    { property: "og:title", content: "Admin — Majorka Racing" },
    { property: "og:description", content: "Majorka Racing admin panel." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPage,
});

const TABS = ["Applications", "Codes", "Users", "Events", "Bookings", "Competitions", "Tracks", "Ratings"] as const;
type Tab = typeof TABS[number];

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const btn = "px-3 h-8 rounded-lg text-xs border border-border";
const btnAccent = "px-3 h-8 rounded-lg text-xs font-medium";
const accent = { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" };

function AdminPage() {
  const roles = useRoles();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(() => {
    const q = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
    return (TABS as readonly string[]).includes(q ?? "") ? (q as Tab) : "Applications";
  });
  const [newEntries, setNewEntries] = useState(0);
  useEffect(() => {
    if (!roles.isAdmin) return;
    supabase.from("competition_entries").select("id", { count: "exact", head: true }).eq("status", "new")
      .then(({ count }) => setNewEntries(count ?? 0));
  }, [roles.isAdmin, tab]);

  useEffect(() => {
    if (!roles.loading && !roles.isAdmin) navigate({ to: "/home" });
  }, [roles.loading, roles.isAdmin, navigate]);

  if (roles.loading || !roles.isAdmin) return <div className="container-app py-10 text-muted-foreground">Loading…</div>;

  return (
    <main className="container-app py-6 space-y-4">
      <h1 className="text-[22px] font-semibold">Admin</h1>
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-3 h-9 rounded-full text-xs border whitespace-nowrap"
            style={tab === t ? { ...accent, borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}>{t}
            {t === "Competitions" && newEntries > 0 && (
              <span className="ml-1.5 inline-flex min-w-4 h-4 px-1 items-center justify-center rounded-full text-[10px] font-semibold bg-destructive text-destructive-foreground">{newEntries}</span>
            )}</button>
        ))}
      </div>
      {tab === "Applications" && <Applications />}
      {tab === "Codes" && <Codes />}
      {tab === "Users" && <Users />}
      {tab === "Events" && <Events />}
      {tab === "Bookings" && <Bookings />}
      {tab === "Competitions" && <Competitions />}
      {tab === "Tracks" && <Tracks />}
      {tab === "Ratings" && <Ratings />}
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-2xl p-4 space-y-2">{children}</div>;
}

function Applications() {
  const [apps, setApps] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const { data } = await supabase.from("organiser_applications").select("*").order("created_at", { ascending: false });
    const list = data ?? [];
    setApps([...list.filter((a) => a.status === "pending"), ...list.filter((a) => a.status !== "pending")]);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function review(id: string, approve: boolean) {
    const { error } = await supabase.rpc("review_organiser_application", { _id: id, _approve: approve, _note: notes[id] || undefined });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved" : "Rejected");
    token().then((accessToken): unknown => accessToken && emailOrganiserApplication({ data: { type: approve ? "approved" : "rejected", applicationId: id, accessToken } })).catch(() => {});
    load();
  }

  if (!apps.length) return <p className="text-sm text-muted-foreground">No applications.</p>;
  const fields: [string, string][] = [["Email", "email"], ["Phone", "phone"], ["Type", "organiser_type"], ["Company", "company"],
    ["Reg. no.", "registration_no"], ["Country", "country"], ["City", "city"], ["Venues", "venues"], ["Events / year", "events_per_year"],
    ["Website", "website"], ["Socials", "socials"], ["Experience", "experience"], ["Message", "message"]];
  return (
    <div className="space-y-3">
      {apps.map((a) => (
        <Card key={a.id}>
          <div className="flex justify-between gap-2">
            <p className="font-medium">{a.full_name}</p>
            <span className="text-xs text-muted-foreground">{a.status} · {formatDate(a.created_at, "en")}</span>
          </div>
          {fields.map(([l, k]) => a[k] ? <p key={k} className="text-xs"><span className="text-muted-foreground">{l}: </span><span className="whitespace-pre-wrap">{a[k]}</span></p> : null)}
          {a.event_types?.length > 0 && <p className="text-xs"><span className="text-muted-foreground">Event types: </span>{a.event_types.map((x: string) => categoryLabel(x)).join(", ")}</p>}
          {a.admin_note && <p className="text-xs"><span className="text-muted-foreground">Admin note: </span>{a.admin_note}</p>}
          {a.status === "pending" && (
            <div className="space-y-2 pt-1">
              <input className="input-field" placeholder="Note (optional)" value={notes[a.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })} />
              <div className="flex gap-2">
                <button className={btnAccent} style={accent} onClick={() => review(a.id, true)}>Approve</button>
                <button className={btn} onClick={() => review(a.id, false)}>Reject</button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint32Array(8);
  crypto.getRandomValues(arr);
  const s = Array.from(arr, (n) => chars[n % chars.length]).join("");
  return `MR-${s.slice(0, 4)}-${s.slice(4)}`;
}

function Codes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<any[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabase.from("organiser_codes").select("*").order("created_at", { ascending: false });
    setCodes(data ?? []);
    const ids = (data ?? []).map((c) => c.used_by).filter(Boolean) as string[];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id,email").in("id", ids);
      setEmails(Object.fromEntries((p ?? []).map((x) => [x.id, x.email ?? ""])));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function generate() {
    const code = genCode();
    const { error } = await supabase.from("organiser_codes").insert({ code, note: note || null, created_by: user?.id });
    if (error) return toast.error(error.message);
    setNote("");
    toast.success(`Created ${code}`);
    load();
  }
  async function revoke(code: string) {
    const { error } = await supabase.from("organiser_codes").update({ revoked: true }).eq("code", code);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-3">
      <Card>
        <input className="input-field" placeholder='Note (e.g. "Raceway Baltic")' value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="cta-button" onClick={generate}>Generate code</button>
      </Card>
      {codes.map((c) => (
        <Card key={c.code}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono font-semibold">{c.code}</p>
            <div className="flex gap-2">
              <button className={btn} onClick={() => { navigator.clipboard.writeText(c.code); toast.success("Copied"); }}>Copy</button>
              {!c.revoked && !c.used_by && <button className={btn} onClick={() => revoke(c.code)}>Revoke</button>}
            </div>
          </div>
          {c.note && <p className="text-xs text-muted-foreground">{c.note}</p>}
          <p className="text-xs">
            {c.revoked ? "Revoked" : c.used_by ? `Used by ${emails[c.used_by] || c.used_by} · ${formatDate(c.used_at, "en")}` : "Unused"}
          </p>
        </Card>
      ))}
    </div>
  );
}

function Users() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string[]>>({});

  const search = useCallback(async () => {
    let query = supabase.from("profiles").select("id,email,username,full_name,blocked,blocked_reason").order("created_at", { ascending: false }).limit(50);
    const s = q.trim().replace(/[,()%]/g, "");
    if (s) query = query.or(`email.ilike.%${s}%,username.ilike.%${s}%,full_name.ilike.%${s}%`);
    const { data } = await query;
    setRows(data ?? []);
    const ids = (data ?? []).map((r) => r.id);
    if (ids.length) {
      const { data: r } = await supabase.from("user_roles").select("user_id,role").in("user_id", ids);
      const m: Record<string, string[]> = {};
      (r ?? []).forEach((x) => { (m[x.user_id] ??= []).push(x.role); });
      setRoleMap(m);
    }
  }, [q]);
  useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [isOwner, setIsOwner] = useState(false);
  useEffect(() => {
    supabase.rpc("is_owner").then(({ data }) => setIsOwner(data === true));
  }, []);

  async function setAdmin(id: string, on: boolean, name: string) {
    if (!confirm(on ? `Give ${name} full admin access?` : `Remove admin access from ${name}?`)) return;
    const { error } = await supabase.rpc("set_admin_role", { _user_id: id, _on: on });
    if (error) return toast.error(error.message);
    toast.success("Done");
    search();
  }


  async function setOrg(id: string, on: boolean) {
    const { error } = await supabase.rpc("set_organiser_role", { _user_id: id, _on: on });
    if (error) return toast.error(error.message);
    const row = rows.find((r) => r.id === id);
    const fallback = row?.full_name || row?.username || row?.email || "user";
    try {
      const accessToken = await token();
      const res: any = accessToken
        ? await emailOrganiserRole({ data: { userId: id, on, accessToken } })
        : { sent: false, reason: "not signed in" };
      if (res?.sent) toast.success(`Done — ${res?.name || fallback} has been emailed`);
      else toast.error(`Role changed, but the email didn't send (${res?.reason || "unknown error"})`);
    } catch (e: any) {
      toast.error(`Role changed, but the email didn't send (${e?.message || "unknown error"})`);
    }
    search();
  }
  async function setBlocked(id: string, blocked: boolean) {
    let reason: string | undefined;
    if (blocked) { const r = prompt("Reason for blocking?"); if (r === null) return; reason = r || undefined; }
    const { error } = await supabase.rpc("set_user_blocked", { _user_id: id, _blocked: blocked, _reason: reason });
    if (error) return toast.error(error.message);
    search();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input-field" placeholder="Search email, username, name" value={q}
          onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <button className={btnAccent + " h-12 px-4 rounded-xl"} style={accent} onClick={search}>Search</button>
      </div>
      {rows.map((r) => {
        const rs = roleMap[r.id] ?? [];
        const isOrg = rs.includes("organiser");
        const isAdm = rs.includes("admin");
        const name = r.full_name || r.username || r.email || "user";
        const tag = "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-border";
        return (
          <Card key={r.id}>
            <p className="font-medium text-sm">{r.full_name || "—"} {r.username && <span className="text-muted-foreground">@{r.username}</span>}
              {isAdm && <span className={tag} style={accent}>Admin</span>}
              {isOrg && <span className={tag}>Organiser</span>}</p>
            <p className="text-xs text-muted-foreground">{r.email}</p>
            <p className="text-xs">Roles: {rs.length ? rs.join(", ") : "user"}{r.blocked && <span style={{ color: "var(--destructive)" }}> · Blocked{r.blocked_reason ? ` (${r.blocked_reason})` : ""}</span>}</p>
            {r.id !== user?.id && (!isAdm || isOwner) && (
              <div className="flex gap-2 flex-wrap">
                <button className={btn} onClick={() => setOrg(r.id, !isOrg)}>{isOrg ? "Remove organiser" : "Make organiser"}</button>
                <button className={btn} onClick={() => setBlocked(r.id, !r.blocked)}>{r.blocked ? "Unblock" : "Block"}</button>
                {isOwner && <button className={btn} onClick={() => setAdmin(r.id, !isAdm, name)}>{isAdm ? "Remove admin" : "Make admin"}</button>}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("events").select("id,title,category,organiser_name,date,status,featured").order("date", { ascending: false });
    setEvents(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function update(id: string, patch: any) {
    const { error } = await supabase.from("events").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    if (patch?.status === "live") {
      const { data: ann } = await supabase.rpc("announce_event", { _event_id: id });
      const n = Number((ann as any)?.recipients ?? 0);
      if (n > 0) toast.success(`Followers notified (${n})`);
    }
    load();
  }
  async function cancel(id: string) {
    if (!confirm("Cancel this event and refund bookings?")) return;
    const res: any = await cancelEventWithNotifications({ data: { eventId: id, accessToken: await token() } });
    if (res && res.ok === false) return toast.error(res.error ?? "Failed");
    toast.success("Event cancelled");
    load();
  }

  return (
    <div className="space-y-3">
      {events.map((e) => (
        <Card key={e.id}>
          <p className="font-medium text-sm">{e.title}{e.featured && <span className="text-xs" style={{ color: "var(--accent)" }}> · Featured</span>}</p>
          <p className="text-xs text-muted-foreground">{e.category} · {e.organiser_name || "—"} · {e.date} · {e.status}</p>
          <div className="flex gap-2 flex-wrap">
            <button className={btn} onClick={() => update(e.id, { featured: !e.featured })}>{e.featured ? "Unfeature" : "Feature"}</button>
            {e.status !== "live" && e.status !== "cancelled" && <button className={btn} onClick={() => update(e.id, { status: "live" })}>Set live</button>}
            {e.status === "live" && <button className={btn} onClick={() => update(e.id, { status: "draft" })}>Set draft</button>}
            {e.status !== "cancelled" && <button className={btn} onClick={() => cancel(e.id)}>Cancel</button>}
            <Link to="/organiser/post-event" search={{ edit: e.id }} className={btn + " inline-flex items-center"}>Edit</Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Bookings() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("bookings").select("id,attendee_name,attendee_email,ticket_count,total_price,status,created_at,events(title)")
      .order("created_at", { ascending: false }).limit(200).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <div className="space-y-2">
      {rows.map((b) => (
        <Card key={b.id}>
          <p className="font-medium text-sm">{b.events?.title ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{b.attendee_name} · {b.attendee_email}</p>
          <p className="text-xs">{b.ticket_count} × · €{Number(b.total_price).toFixed(2)} · {b.status} · {formatDate(b.created_at, "en")}</p>
        </Card>
      ))}
    </div>
  );
}

function Competitions() {
  const [entries, setEntries] = useState<any[]>([]);
  const [comps, setComps] = useState<any[]>([]);
  const load = useCallback(async () => {
    const [{ data: e }, { data: c }] = await Promise.all([
      supabase.from("competition_entries").select("*").order("created_at", { ascending: false }),
      supabase.from("competitions").select("id,name,status,sort,cover_image_url").order("sort"),
    ]);
    setEntries(e ?? []);
    setComps(c ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const nameOf = (id: string) => comps.find((c) => c.id === id)?.name ?? "—";
  const [openComp, setOpenComp] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("competition_entries").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function toggleLive(id: string, status: string) {
    const { error } = await supabase.from("competitions").update({ status: status === "live" ? "draft" : "live" }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-sm">Entries</h2>
      {entries.length === 0 && <p className="text-sm text-muted-foreground">No entries.</p>}
      {entries.map((e) => (
        <Card key={e.id}>
          <div className="flex justify-between gap-2">
            <p className="font-medium text-sm">{nameOf(e.competition_id)}</p>
            <span className="text-xs text-muted-foreground">{formatDate(e.created_at, "en")}</span>
          </div>
          <p className="text-sm">{e.full_name}</p>
          <p className="text-xs text-muted-foreground">{e.email} · {e.phone}</p>
          <p className="text-xs">Car: {e.car}{e.class ? ` · Class: ${e.class}` : ""} · Licence: {e.has_licence ? "yes" : "no"}</p>
          {e.needs_help?.length > 0 && <p className="text-xs">Needs help: {e.needs_help.join(", ")}</p>}
          {e.message && <p className="text-xs whitespace-pre-wrap">{e.message}</p>}
          <select className="input-field" value={e.status} onChange={(ev) => setStatus(e.id, ev.target.value)}>
            {["new", "contacted", "entered", "dropped"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Card>
      ))}
      <h2 className="font-medium text-sm pt-2">Competitions</h2>
      {comps.map((c) => (
        <Card key={c.id}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm">{c.name}</p>
            <div className="flex gap-2">
              <button className={btn} onClick={() => setOpenComp(openComp === c.id ? null : c.id)}>{openComp === c.id ? "Hide tickets" : "Tickets"}</button>
              <button className={btn} onClick={() => toggleLive(c.id, c.status)}>{c.status === "live" ? "Live → Draft" : "Draft → Live"}</button>
            </div>
          </div>
          <CompCover id={c.id} url={c.cover_image_url} onChange={load} />
          {openComp === c.id && <RaceAdmin competitionId={c.id} competitionName={c.name} />}
        </Card>
      ))}
    </div>
  );
}

function CompCover({ id, url, onChange }: { id: string; url: string | null; onChange: () => void }) {
  const { user } = useAuth();
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  function pick() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => { const f = input.files?.[0]; if (f) setCropSrc(URL.createObjectURL(f)); };
    input.click();
  }
  async function save(value: string | null) {
    const { error } = await supabase.from("competitions").update({ cover_image_url: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Done"); onChange();
  }
  async function upload(blob: Blob) {
    if (!user) return;
    setBusy(true);
    const path = `${user.id}/competition-${id}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("event-covers").upload(path, blob, { contentType: "image/jpeg" });
    setBusy(false);
    if (error) return toast.error(error.message);
    await save(supabase.storage.from("event-covers").getPublicUrl(path).data.publicUrl);
  }
  return (
    <div className="flex items-center gap-2 pt-2">
      {url && <img src={url} alt="" className="w-24 aspect-video rounded-lg object-cover" />}
      <span className="text-xs text-muted-foreground flex-1">Cover photo</span>
      <button className={btn} disabled={busy} onClick={pick}>{url ? "Replace" : "Upload"}</button>
      {url && <button className={btn} onClick={() => save(null)}>Remove</button>}
      {cropSrc && <ImageCropModal imageSrc={cropSrc} aspectRatio={16 / 9}
        onConfirm={(blob) => { URL.revokeObjectURL(cropSrc); setCropSrc(null); upload(blob); }}
        onCancel={() => { URL.revokeObjectURL(cropSrc); setCropSrc(null); }} />}
    </div>
  );
}

const EMPTY_TT = { id: "", round_label: "", round_date: "", kind: "spectator", name: "", price: "0", capacity: "", sales_open: true };

function RaceAdmin({ competitionId, competitionName }: { competitionId: string; competitionName: string }) {
  const [types, setTypes] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null);
  const [desk, setDesk] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data: tt } = await supabase.from("race_ticket_types").select("*").eq("competition_id", competitionId).order("round_date", { nullsFirst: false });
    setTypes(tt ?? []);
    const ids = (tt ?? []).map((x: any) => x.id);
    if (!ids.length) return setTickets([]);
    const { data: rt } = await supabase.from("race_tickets").select("*").in("ticket_type_id", ids).order("created_at", { ascending: false });
    setTickets(rt ?? []);
  }, [competitionId]);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.round_label.trim() || !form.name.trim()) return toast.error("Round label and name are required");
    const row = { competition_id: competitionId, round_label: form.round_label.trim(), round_date: form.round_date || null, kind: form.kind, name: form.name.trim(),
      price: Number(form.price) || 0, capacity: form.capacity === "" ? null : Number(form.capacity), sales_open: form.sales_open };
    const { error } = form.id ? await supabase.from("race_ticket_types").update(row).eq("id", form.id) : await supabase.from("race_ticket_types").insert(row);
    if (error) return toast.error(error.message);
    setForm(null); load();
  }
  async function setTicket(id: string, status: string) {
    const { error } = await supabase.from("race_tickets").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  function csv(type: any) {
    const rows = tickets.filter((x) => x.ticket_type_id === type.id);
    const head = ["name", "email", "phone", "car", "class", "licence_no", "quantity", "status", "payment_status", "check_in_code", "checked_in_at"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = [head.join(","), ...rows.map((r) => head.map((h) => esc(r[h])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
    a.download = `${competitionName}-${type.round_label}-${type.name}.csv`.replace(/[^\w.-]+/g, "_");
    a.click();
  }
  const f = (k: string, label: string, type = "text") => (
    <label className="block text-xs text-muted-foreground">{label}<input className="input-field mt-1" type={type} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
  );
  const rounds = Array.from(new Set(types.map((x) => x.round_label)));

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {form ? (
        <div className="space-y-2">
          {f("round_label", "Round label")}
          {f("round_date", "Round date", "date")}
          <label className="block text-xs text-muted-foreground">Kind
            <select className="input-field mt-1" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="spectator">Spectator</option><option value="racer">Racer</option>
            </select>
          </label>
          {f("name", "Name")}
          {f("price", "Price (EUR)", "number")}
          {f("capacity", "Capacity (empty = unlimited)", "number")}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.sales_open} onChange={(e) => setForm({ ...form, sales_open: e.target.checked })} /> Sales open</label>
          <div className="flex gap-2"><button className={btnAccent} style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }} onClick={save}>Save</button><button className={btn} onClick={() => setForm(null)}>Cancel</button></div>
        </div>
      ) : <button className={btn} onClick={() => setForm({ ...EMPTY_TT })}>+ Add ticket type</button>}

      {rounds.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {rounds.map((r) => <button key={r} className={btn} onClick={() => setDesk(desk === r ? null : r)}>{desk === r ? "Close desk" : `Check-in: ${r}`}</button>)}
        </div>
      )}
      {desk && <RaceCheckInDesk tickets={tickets.filter((x) => types.find((tt) => tt.id === x.ticket_type_id)?.round_label === desk)} onChange={load} />}

      {types.map((tt) => {
        const list = tickets.filter((x) => x.ticket_type_id === tt.id);
        return (
          <div key={tt.id} className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex justify-between gap-2 items-start">
              <div>
                <p className="text-sm font-medium">{tt.round_label}{tt.round_date ? ` · ${formatDate(tt.round_date, "en")}` : ""}</p>
                <p className="text-xs text-muted-foreground">{tt.kind} · {tt.name} · €{Number(tt.price).toFixed(2)} · {tt.capacity ?? "∞"} cap · {tt.sales_open ? "on sale" : "closed"}</p>
              </div>
              <div className="flex gap-1">
                <button className={btn} onClick={() => setForm({ ...tt, round_date: tt.round_date ?? "", price: String(tt.price), capacity: tt.capacity == null ? "" : String(tt.capacity) })}>Edit</button>
                <button className={btn} onClick={() => csv(tt)}>CSV</button>
              </div>
            </div>
            {list.length === 0 && <p className="text-xs text-muted-foreground">No tickets yet.</p>}
            {list.map((r) => (
              <div key={r.id} className="text-xs border-t border-border pt-2 space-y-1">
                <p className="font-medium">{r.holder_name} · ×{r.quantity} · {r.status} · payment {r.payment_status}{r.checked_in_at ? " · checked in" : ""}</p>
                <p className="text-muted-foreground">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                {(r.car || r.class || r.licence_no) && <p>Car: {r.car || "—"} · Class: {r.class || "—"} · Licence: {r.licence_no || "—"}</p>}
                {tt.kind === "racer" && r.status !== "cancelled" && (
                  <div className="flex gap-2">
                    {r.status !== "confirmed" && <button className={btn} onClick={() => setTicket(r.id, "confirmed")}>Confirm</button>}
                    <button className={btn} onClick={() => confirm("Cancel this entry?") && setTicket(r.id, "cancelled")}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function RaceCheckInDesk({ tickets, onChange }: { tickets: any[]; onChange: () => void }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanRef = useRef<any>(null);
  const busy = useRef(false);

  async function check(raw: string) {
    if (busy.current) return;
    busy.current = true;
    const c = codeFromScan(raw);
    const tk = tickets.find((x) => x.check_in_code?.toUpperCase() === c);
    if (!tk) setMsg({ ok: false, text: `No ticket for code ${c}` });
    else if (tk.status !== "confirmed") setMsg({ ok: false, text: `${tk.holder_name}: ticket is ${tk.status}` });
    else if (tk.checked_in_at) setMsg({ ok: false, text: `${tk.holder_name} already checked in` });
    else {
      const { error } = await supabase.from("race_tickets").update({ checked_in_at: new Date().toISOString() }).eq("id", tk.id);
      setMsg(error ? { ok: false, text: error.message } : { ok: true, text: `${tk.holder_name} ×${tk.quantity} checked in` });
      onChange();
    }
    setCode("");
    setTimeout(() => { busy.current = false; }, 1500);
  }
  async function stop() { const s = scanRef.current; scanRef.current = null; setScanning(false); if (s) await s.stop().catch(() => {}); }
  async function start() {
    setScanning(true);
    const { Html5Qrcode } = await import("html5-qrcode");
    const s = new Html5Qrcode("mr-race-scanner");
    scanRef.current = s;
    await s.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 220, height: 220 } }, (txt: string) => check(txt), () => {})
      .catch((e: any) => { toast.error(String(e?.message ?? e)); setScanning(false); });
  }
  useEffect(() => () => { scanRef.current?.stop().catch(() => {}); }, []);
  const inCount = tickets.filter((x) => x.checked_in_at).reduce((n, x) => n + x.quantity, 0);
  const total = tickets.filter((x) => x.status === "confirmed").reduce((n, x) => n + x.quantity, 0);

  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <p className="text-xs text-muted-foreground">Checked in {inCount} / {total}</p>
      <div id="mr-race-scanner" className={scanning ? "rounded-xl overflow-hidden" : "hidden"} />
      <button className={btn} onClick={scanning ? stop : start}>{scanning ? "Stop camera" : "Scan QR"}</button>
      <div className="flex gap-2">
        <input className="input-field" placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && code && check(code)} />
        <button className={btn} onClick={() => code && check(code)}>Check in</button>
      </div>
      {msg && <p className="text-sm font-medium" style={{ color: msg.ok ? "var(--success)" : "var(--accent)" }}>{msg.text}</p>}
    </div>
  );
}

function Tracks() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("venues").select("id,name,slug,city,country,status,owner_id,profiles:owner_id(full_name,email)" as any).order("created_at", { ascending: false })
    .then(({ data, error }) => {
      if (error) supabase.from("venues").select("id,name,slug,city,country,status,owner_id").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
      else setRows((data as any) ?? []);
    });
  useEffect(() => { load(); }, []);
  async function toggle(v: any) {
    const { error } = await supabase.from("venues").update({ status: v.status === "live" ? "draft" : "live" }).eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Done"); load();
  }
  if (!rows.length) return <p className="text-sm text-muted-foreground">No tracks yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map((v) => (
        <Card key={v.id}>
          <div className="flex justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium truncate">{v.name}</p>
              <p className="text-xs text-muted-foreground">{[v.city, v.country].filter(Boolean).join(" · ")} · Owner: {v.profiles?.full_name || v.profiles?.email || v.owner_id?.slice(0, 8) || "—"}</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 h-fit rounded-full bg-input">{v.status}</span>
          </div>
          <div className="flex gap-2 text-xs">
            <button onClick={() => toggle(v)} className="px-3 h-8 rounded-full border border-border">{v.status === "live" ? "Set draft" : "Set live"}</button>
            <a href={`/tracks/${v.slug}`} className="px-3 h-8 inline-flex items-center rounded-full border border-border">Open</a>
            {v.profiles?.email && <a href={`mailto:${v.profiles.email}`} className="px-3 h-8 inline-flex items-center rounded-full border border-border">Email owner</a>}
          </div>
        </Card>
      ))}
    </div>
  );
}
