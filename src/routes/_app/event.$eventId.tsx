import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { eventCover } from "@/lib/event-cover";
import { categoryLabel } from "@/lib/categories";
import { ArrowLeft, Calendar, Clock, MapPin, Share2, Heart, User, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/event/$eventId")({
  component: EventDetail,
});

function EventDetail() {
  const { eventId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [bookedCount, setBookedCount] = useState(0);
  const [myBooking, setMyBooking] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.from("events").select("*").eq("id", eventId).maybeSingle()
      .then(({ data }) => setEvent(data));
    supabase.from("bookings").select("ticket_count,status").eq("event_id", eventId)
      .then(({ data }) => {
        const total = (data ?? []).reduce((s: number, b: any) =>
          b.status === "cancelled" ? s : s + (b.ticket_count ?? 1), 0);
        setBookedCount(total);
      });
  }, [eventId]);

  useEffect(() => {
    if (!user) { setMyBooking(null); return; }
    supabase.from("bookings").select("id")
      .eq("event_id", eventId).eq("user_id", user.id).eq("status", "confirmed")
      .maybeSingle()
      .then(({ data }) => setMyBooking((data as any) ?? null));
  }, [eventId, user]);

  if (!event) {
    return <div className="container-app py-10 text-muted-foreground">Loading…</div>;
  }
  const soldOut = event.capacity > 0 && bookedCount >= event.capacity;

  return (
    <main className="pb-32">
      <div className="relative aspect-[4/3]">
        <img
          src={eventCover(event.category, event.cover_image_url)}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-overlay" />
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <button onClick={() => navigate({ to: "/home" })}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
              <Share2 size={16} color="#fff" />
            </button>
            <button className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
              <Heart size={16} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      <div className="container-app py-5 space-y-5">
        <div className="space-y-2">
          <span className="category-pill">{categoryLabel(event.category)}</span>
          <h1 className="text-[24px] font-semibold leading-tight">{event.title}</h1>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-foreground">
            <Calendar size={16} className="text-muted-foreground" />
            {new Date(event.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            {event.time && <> · {String(event.time).slice(0, 5)}</>}
          </div>
          {event.duration && (
            <div className="flex items-center gap-3 text-foreground">
              <Clock size={16} className="text-muted-foreground" />
              {event.duration}
            </div>
          )}
          {event.location_name && (
            <div className="flex items-center gap-3 text-foreground">
              <MapPin size={16} className="text-muted-foreground" />
              {event.location_name}{event.city ? `, ${event.city}` : ""}{event.country ? `, ${event.country}` : ""}
            </div>
          )}
          {(event.location_name || event.city || event.country) && (() => {
            const query = event.location_lat && event.location_lng
              ? `${event.location_lat},${event.location_lng}`
              : [event.location_name, event.city, event.country].filter(Boolean).join(", ");
            const embed = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
            const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
            return (
              <div className="space-y-1.5">
                <div onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                  className="cursor-pointer overflow-hidden" style={{ borderRadius: 16 }}>
                  <iframe
                    src={embed}
                    style={{ width: "100%", height: 180, border: 0, borderRadius: 16, pointerEvents: "none" }}
                    loading="lazy"
                    title="Event location map"
                  />
                </div>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  Open in Google Maps <ExternalLink size={11} />
                </a>
              </div>
            );
          })()}
          {event.organiser_name && (
            <div className="flex items-center gap-3 text-foreground">
              <User size={16} className="text-muted-foreground" />
              Organised by {event.organiser_name}
            </div>
          )}
        </div>

        {event.description && (
          <div>
            <h2 className="text-base font-semibold mb-2">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-2xl font-semibold">{event.price === 0 ? "Free" : `€${event.price}`}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Capacity</p>
            <p className="text-sm font-medium">{event.capacity} spots</p>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border"
        style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}
      >
        <div className="container-app py-3">
          {!user ? (
            <Link to="/login" className="cta-button">Log in to book</Link>
          ) : soldOut ? (
            <button disabled className="cta-button opacity-60 cursor-not-allowed">Sold Out</button>
          ) : (
            <Link to="/book/$eventId" params={{ eventId }} className="cta-button">
              Book Now
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
