import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRoles } from "@/lib/roles";
import { emailOrganiserApplication } from "@/lib/app-email.functions";
import { cancelEventWithNotifications } from "@/lib/cancel-event.functions";

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

const TABS = ["Applications", "Codes", "Users", "Events", "Bookings", "Competitions"] as const;
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
  const [tab, setTab] = useState<Tab>("Applications");

  useEffect(() => {
    if (!roles.loading && !roles.isAdmin) navigate({ to: "/home" });
  }, [roles.loading, roles.isAdmin, navigate]);

  if (roles.loading || !roles.isAdmin) return <div className="container-app py-10 text-muted-foreground">Loading…</div>;

  return (
    <main className="container-app py-6 space-y-4">
      <h1 className="text-[22px] font-semibold">Admin</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-3 h-9 rounded-full text-xs border whitespace-nowrap"
            style={tab === t ? { ...accent, borderColor: "var(--accent)" } : { borderColor: "var(--border)" }}>{t}</button>
        ))}
      </div>
      {tab === "Applications" && <Applications />}
      {tab === "Codes" && <Codes />}
      {tab === "Users" && <Users />}
      {tab === "Events" && <Events />}
      {tab === "Bookings" && <Bookings />}
      {tab === "Competitions" && <Competitions />}
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
    token().then((accessToken) => accessToken && emailOrganiserApplication({ data: { type: approve ? "approved" : "rejected", applicationId: id, accessToken } })).catch(() => {});
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
            <span className="text-xs text-muted-foreground">{a.status} · {new Date(a.created_at).toLocaleDateString()}</span>
          </div>
          {fields.map(([l, k]) => a[k] ? <p key={k} className="text-xs"><span className="text-muted-foreground">{l}: </span><span className="whitespace-pre-wrap">{a[k]}</span></p> : null)}
          {a.event_types?.length > 0 && <p className="text-xs"><span className="text-muted-foreground">Event types: </span>{a.event_types.join(", ")}</p>}
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
            {c.revoked ? "Revoked" : c.used_by ? `Used by ${emails[c.used_by] || c.used_by} · ${new Date(c.used_at).toLocaleDateString()}` : "Unused"}
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

  async function setOrg(id: string, on: boolean) {
    const { error } = await supabase.rpc("set_organiser_role", { _user_id: id, _on: on });
    if (error) return toast.error(error.message);
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
        return (
          <Card key={r.id}>
            <p className="font-medium text-sm">{r.full_name || "—"} {r.username && <span className="text-muted-foreground">@{r.username}</span>}</p>
            <p className="text-xs text-muted-foreground">{r.email}</p>
            <p className="text-xs">Roles: {rs.length ? rs.join(", ") : "user"}{r.blocked && <span style={{ color: "var(--destructive)" }}> · Blocked{r.blocked_reason ? ` (${r.blocked_reason})` : ""}</span>}</p>
            {r.id !== user?.id && (
              <div className="flex gap-2 flex-wrap">
                <button className={btn} onClick={() => setOrg(r.id, !isOrg)}>{isOrg ? "Remove organiser" : "Make organiser"}</button>
                <button className={btn} onClick={() => setBlocked(r.id, !r.blocked)}>{r.blocked ? "Unblock" : "Block"}</button>
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
          <p className="text-xs">{b.ticket_count} × · €{Number(b.total_price).toFixed(2)} · {b.status} · {new Date(b.created_at).toLocaleDateString()}</p>
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
      supabase.from("competitions").select("id,name,status,sort").order("sort"),
    ]);
    setEntries(e ?? []);
    setComps(c ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const nameOf = (id: string) => comps.find((c) => c.id === id)?.name ?? "—";

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
            <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
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
            <button className={btn} onClick={() => toggleLive(c.id, c.status)}>{c.status === "live" ? "Live → Draft" : "Draft → Live"}</button>
          </div>
        </Card>
      ))}
    </div>
  );
}
