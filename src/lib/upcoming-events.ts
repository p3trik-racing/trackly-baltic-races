import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface UpcomingEvent {
  id: string; title: string; category: string; date: string; time: string | null;
  duration: string | null; city: string | null; country: string | null; price: number;
  currency: string; cover_image_url: string | null; location_name: string | null;
  location_lat: number | null; location_lng: number | null;
}

export async function fetchUpcomingEvents(): Promise<UpcomingEvent[]> {
  const { data } = await supabase
    .from("events")
    .select("id,title,category,date,time,duration,city,country,price,currency,cover_image_url,location_name,location_lat,location_lng")
    .eq("status", "live")
    .gte("date", format(new Date(), "yyyy-MM-dd"))
    .order("date", { ascending: true });
  return (data as any) ?? [];
}
