import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Download } from "lucide-react";

export const Route = createFileRoute("/_app/organiser_/events/$eventId/bookings")({
  component: EventBookingsPage,
});

interface Booking {
  id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  ticket_count: number;
  organiser_payout: number;
  status: string;
  created_at: string;
}

function EventBookingsPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    supabase.from("events").select("*").eq("id", eventId).maybeSingle().then(({ data }) => setEvent(data));
    supabase.from("bookings").select("*").eq("event_id", eventId).order("created_at", { ascending: false })
      .then(({ data }) => setBookings((data as any) ?? []));
  }, [eventId]);

  const active = bookings.filter((b) => b.status !== "cancelled");
  const totalTickets = active.reduce((s, b) => s + b.ticket_count, 0);
  const revenue = active.reduce((s, b) => s + Number(b.organiser_payout ?? 0), 0);
  const remaining = event ? Math.max(0, (event.capacity ?? 0) - totalTickets) : 0;

  function exportCsv() {
    const rows = [
      ["Name", "Email", "Phone", "Reference", "Date", "Tickets", "Status"],
      ...bookings.map((b) => [
        b.attendee_name, b.attendee_email, b.attendee_phone ?? "",
        b.id, new Date(b.created_at).toISOString(), String(b.ticket_count), b.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bookings-${eventId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="container-app py-6 space-y-5">
      <button onClick={() => navigate({ to: "/organiser" })} className="inline-flex items-center gap-2 text-muted-foreground">
        <ArrowLeft size={18} /> Back
      </button>

      <h1 className="text-[22px] font-semibold leading-tight">{event?.title ?? "Event"}</h1>

      <div className="bg-card border border-border rounded-2xl p-4 grid grid-cols-3 text-center">
        <div>
          <p className="text-lg font-semibold">{active.length}</p>
          <p className="text-[11px] text-muted-foreground">Bookings</p>
        </div>
        <div className="border-x border-border">
          <p className="text-lg font-semibold">€{revenue.toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground">Revenue</p>
        </div>
        <div>
          <p className="text-lg font-semibold">{remaining}</p>
          <p className="text-[11px] text-muted-foreground">Spots left</p>
        </div>
      </div>

      <button onClick={exportCsv} disabled={!bookings.length}
        className="w-full h-11 rounded-xl border border-border text-sm font-medium inline-flex items-center justify-center gap-2 text-muted-foreground disabled:opacity-40">
        <Download size={16} /> Export CSV
      </button>

      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">No bookings yet</p>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="bg-card border border-border rounded-2xl p-4 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{b.attendee_name}</p>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: b.status === "cancelled"
                      ? "color-mix(in oklab, var(--accent) 20%, transparent)"
                      : "color-mix(in oklab, var(--success) 22%, transparent)",
                    color: b.status === "cancelled" ? "var(--accent)" : "oklch(0.78 0.16 145)",
                  }}>
                  {b.status === "cancelled" ? "Cancelled" : "Confirmed"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{b.attendee_email}</p>
              {b.attendee_phone && <p className="text-xs text-muted-foreground">{b.attendee_phone}</p>}
              <p className="text-[11px] text-muted-foreground pt-1">
                Ref: {b.id.slice(0, 8).toUpperCase()} · {new Date(b.created_at).toLocaleDateString("en-GB")}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
