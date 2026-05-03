import { Link } from "@tanstack/react-router";
import { MapPin, Calendar } from "lucide-react";
import { categoryLabel } from "@/lib/categories";
import { eventCover } from "@/lib/event-cover";

export interface EventCardData {
  id: string;
  title: string;
  category: string;
  date: string;
  city: string | null;
  country: string | null;
  price: number;
  currency: string;
  cover_image_url: string | null;
}

export function EventCard({ event, large = false }: { event: EventCardData; large?: boolean }) {
  const cover = eventCover(event.category, event.cover_image_url);
  const dateStr = new Date(event.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      to="/event/$eventId"
      params={{ eventId: event.id }}
      className="block bg-card rounded-2xl overflow-hidden border border-border"
    >
      <div className={`relative ${large ? "aspect-[16/10]" : "aspect-[16/9]"}`}>
        <img
          src={cover}
          alt={event.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 gradient-overlay" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-medium text-base leading-tight line-clamp-2">
            {event.title}
          </h3>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="category-pill">{categoryLabel(event.category)}</span>
          <span className="text-foreground font-semibold text-sm">
            {event.price === 0 ? "Free" : `€${event.price}`}
          </span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span className="flex items-center gap-1">
            <Calendar size={12} /> {dateStr}
          </span>
          {event.city && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {event.city}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
