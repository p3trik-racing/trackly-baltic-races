import { useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { emailEventPhotos } from "@/lib/app-email.functions";
import { fireAndForget } from "@/lib/access-token";

/** Organiser button: share a photos link with every confirmed attendee (notification + email). */
export function SharePhotos({ eventId, current, className, onShared }: { eventId: string; current?: string | null; className?: string; onShared?: (url: string) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(current ?? "");
  const [busy, setBusy] = useState(false);

  async function send() {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return toast.error(t("photos.invalid"));
    setBusy(true);
    const { data, error } = await supabase.rpc("share_event_photos", { _event_id: eventId, _url: u });
    setBusy(false);
    if (error) return toast.error(error.message);
    fireAndForget((accessToken) => emailEventPhotos({ data: { accessToken, eventId } }));
    toast.success(t("photos.sent", { n: data ?? 0 }));
    setOpen(false);
    onShared?.(u);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={className ?? "w-full h-11 rounded-xl border border-border text-sm font-medium inline-flex items-center justify-center gap-2"}>
        <Camera size={16} /> {current ? t("photos.shared") : t("photos.share")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("photos.title")}</DialogTitle></DialogHeader>
          <label className="text-xs text-muted-foreground">{t("photos.linkLabel")}</label>
          <input className="input-field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" />
          <p className="text-xs text-muted-foreground">{t("photos.hint")}</p>
          <button onClick={send} disabled={busy} className="cta-button disabled:opacity-50">{t("photos.send")}</button>
        </DialogContent>
      </Dialog>
    </>
  );
}
