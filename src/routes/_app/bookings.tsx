import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { eventCover } from "@/lib/event-cover";
import { Calendar, MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/bookings")({
  component: BookingsPage,
});

interface BookingRow {
  id: string;
  ticket_count: number;
  total_price: number;
  status: string;
  events: {
    id: string;
    title: string;
    date: string;
    city: string | null;
    category: string;
    cover_image_url: string | null;
  };
}

function BookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    if (user === null) navigate({ to: "/login" });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("bookings")
      .select("id,ticket_count,total_price,status,events(id,title,date,city,category,cover_image_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setBookings((data as any) ?? []));
  }, [user]);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = bookings.filter((b) => {
    if (tab === "cancelled") return b.status === "cancelled";
    if (b.status === "cancelled") return false;
    return tab === "upcoming" ? b.events.date >= today : b.events.date < today;
  });

  return (
    <main className="container-app py-6 space-y-4">
      <h1 className="text-[22px] font-semibold">My Bookings</h1>
      <div className="flex gap-2 bg-card p-1 rounded-xl border border-border">
        {(["upcoming", "past", "cancelled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 h-9 rounded-lg text-sm font-medium capitalize"
            style={{
              backgroundColor: tab === t ? "var(--accent)" : "transparent",
              color: tab === t ? "#fff" : "var(--muted-foreground)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No {tab} bookings yet.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <Link
              key={b.id}
              to="/booking/$bookingId"
              params={{ bookingId: b.id }}
              className="flex gap-3 bg-card border border-border rounded-2xl overflow-hidden p-3"
            >
              <img
                src={eventCover(b.events.category, b.events.cover_image_url)}
                alt=""
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-sm line-clamp-1">{b.events.title}</h3>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor:
                        b.status === "confirmed"
                          ? "color-mix(in oklab, var(--success) 20%, transparent)"
                          : "color-mix(in oklab, var(--accent) 20%, transparent)",
                      color: b.status === "confirmed" ? "var(--success)" : "var(--accent)",
                    }}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Calendar size={12} />{new Date(b.events.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  {b.events.city && <span className="flex items-center gap-1"><MapPin size={12} />{b.events.city}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Ref: {b.id.slice(0, 8).toUpperCase()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
