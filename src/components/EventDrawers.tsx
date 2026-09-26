import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Navigation, Map, MapPin, CalendarDays, Download, ChevronRight } from "lucide-react";
import { buildGoogleCalendarUrl, downloadIcs, type CalEvent } from "@/lib/calendar";
import type { ReactNode } from "react";

export interface DirEvent {
  location_name?: string | null;
  city?: string | null;
  country?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
}

export function directionLinks(e: DirEvent) {
  const has = e.location_lat != null && e.location_lng != null;
  const ll = `${e.location_lat},${e.location_lng}`;
  const name = encodeURIComponent([e.location_name, e.city, e.country].filter(Boolean).join(", "));
  return {
    waze: has ? `https://waze.com/ul?ll=${ll}&navigate=yes` : `https://waze.com/ul?q=${name}&navigate=yes`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${has ? ll : name}`,
    apple: `https://maps.apple.com/?daddr=${has ? ll : name}`,
  };
}

const rowCls = "flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-card border border-border text-sm font-medium text-left";

function Row({ icon, label, href, onClick }: { icon: ReactNode; label: string; href?: string; onClick?: () => void }) {
  const inner = (<>{icon}<span className="flex-1">{label}</span><ChevronRight size={16} className="text-muted-foreground" /></>);
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={rowCls}>{inner}</a>
    : <button type="button" onClick={onClick} className={rowCls}>{inner}</button>;
}

interface Props { open: boolean; onOpenChange: (o: boolean) => void }

export function DirectionsDrawer({ event, open, onOpenChange }: Props & { event: DirEvent }) {
  const l = directionLinks(event);
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="container-app pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Open in</DrawerTitle>
            {event.location_name && <DrawerDescription>{event.location_name}</DrawerDescription>}
          </DrawerHeader>
          <div className="space-y-2">
            <Row icon={<Navigation size={18} />} label="Waze" href={l.waze} />
            <Row icon={<Map size={18} />} label="Google Maps" href={l.google} />
            <Row icon={<MapPin size={18} />} label="Apple Maps" href={l.apple} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function CalendarDrawer({ event, open, onOpenChange }: Props & { event: CalEvent }) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="container-app pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Add to calendar</DrawerTitle>
            <DrawerDescription>{event.title}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-2">
            <Row icon={<CalendarDays size={18} />} label="Google Calendar" href={buildGoogleCalendarUrl(event)} />
            <Row icon={<Download size={18} />} label="Apple / Outlook (.ics)" onClick={() => { downloadIcs(event); onOpenChange(false); }} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
