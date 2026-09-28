import { supabase } from "@/integrations/supabase/client";

export interface CheckInResult {
  ok?: boolean;
  already?: boolean;
  error?: string;
  booking_id?: string;
  name?: string;
  phone?: string;
  spots?: number;
  event_id?: string;
  event_title?: string;
  event_date?: string;
  checked_in_at?: string;
}

export async function checkIn(args: { bookingId?: string; code?: string; eventId?: string }): Promise<CheckInResult> {
  const params: { _booking_id?: string; _code?: string; _event_id?: string } = {};
  if (args.bookingId) params._booking_id = args.bookingId;
  if (args.code) params._code = args.code.trim().toUpperCase();
  if (args.eventId) params._event_id = args.eventId;
  const { data, error } = await supabase.rpc("check_in_booking", params as any);
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: "unknown" }) as CheckInResult;
}

/** Parse a scanned QR: full check-in URL → {bookingId, code}; otherwise treat as a raw 8-char code. */
export function parseScan(text: string): { bookingId?: string; code?: string } {
  try {
    const u = new URL(text.trim());
    const m = u.pathname.match(/\/checkin\/([0-9a-f-]{36})/i);
    if (m) return { bookingId: m[1], code: u.searchParams.get("c") ?? undefined };
  } catch {}
  const raw = text.trim().toUpperCase();
  if (/^[A-Z0-9]{8}$/.test(raw)) return { code: raw };
  return {};
}

export const hhmm = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
