import { addHours, format } from "date-fns";

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  duration?: string | null;
  description?: string | null;
  location_name?: string | null;
  city?: string | null;
  country?: string | null;
}

export function parseDurationHours(d?: string | null): number | null {
  if (!d) return null;
  const m = d.trim().toLowerCase().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|d|day|days)\b/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2].startsWith("d") ? n * 24 : n;
}

/** Converts a wall-clock time in Europe/Riga to a UTC Date. */
function rigaToUtc(date: string, time: string): Date {
  const [y, mo, d] = date.slice(0, 10).split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi || 0);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Riga", hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
  );
  const asRiga = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return new Date(guess - (asRiga - guess));
}

export function eventRange(e: CalEvent) {
  const start = rigaToUtc(e.date, e.time ? String(e.time).slice(0, 5) : "10:00");
  const end = addHours(start, parseDurationHours(e.duration) ?? 3);
  return { start, end };
}

const utcBasic = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function eventLocation(e: CalEvent) {
  return [e.location_name, e.city, e.country].filter(Boolean).join(", ");
}

export function buildGoogleCalendarUrl(e: CalEvent) {
  const { start, end } = eventRange(e);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utcBasic(start)}/${utcBasic(end)}`,
    details: (e.description ?? "").slice(0, 1000),
    location: eventLocation(e),
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function buildIcs(e: CalEvent) {
  const { start, end } = eventRange(e);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Majorka Racing//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@majorkaracing.com`,
    `DTSTAMP:${utcBasic(new Date())}`,
    `DTSTART:${utcBasic(start)}`,
    `DTEND:${utcBasic(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc((e.description ?? "").slice(0, 300))}`,
    `LOCATION:${esc(eventLocation(e))}`,
    `URL:https://majorkaracing.com/event/${e.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(e: CalEvent) {
  const slug = e.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const url = URL.createObjectURL(new Blob([buildIcs(e)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `majorka-${slug || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fmtDay = (d: Date) => format(d, "yyyy-MM-dd");
