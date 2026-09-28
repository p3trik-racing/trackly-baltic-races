import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare } from "lucide-react";

export function MessageAttendees({ eventId }: { eventId: string }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<{ id: string; message: string; created_at: string }[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.from("organiser_messages").select("*")
      .eq("event_id", eventId).order("created_at", { ascending: false }).limit(5);
    setHistory((data as any) ?? []);
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  async function send() {
    const msg = text.trim();
    if (!msg) return;
    setSending(true);
    const { data, error } = await supabase.rpc("send_attendee_message", { _event_id: eventId, _message: msg });
    setSending(false);
    if (error) return toast.error(error.message);
    const r = (data ?? {}) as { recipients?: number };
    toast.success(t("message.sent", { count: r.recipients ?? 0 }));
    setText(""); setOpen(false); load();
  }

  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(true)}
        className="w-full h-11 rounded-xl border border-border text-sm font-medium inline-flex items-center justify-center gap-2">
        <MessageSquare size={16} /> {t("message.button")}
      </button>
      {history.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-3 space-y-2">
          <p className="text-xs text-muted-foreground">{t("message.history")}</p>
          {history.map((m) => (
            <div key={m.id} className="text-sm">
              <p className="whitespace-pre-wrap">{m.message}</p>
              <p className="text-[11px] text-muted-foreground">{formatDate(m.created_at, lang, "dateTime")}</p>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("message.title")}</DialogTitle></DialogHeader>
          <textarea className="input-field py-3" style={{ height: "auto", minHeight: 120 }} rows={5} maxLength={1000}
            value={text} onChange={(e) => setText(e.target.value)} placeholder={t("message.placeholder")} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{text.length}/1000</span>
            <button onClick={send} disabled={sending || !text.trim()}
              className="px-5 h-10 rounded-xl text-sm font-medium text-accent-foreground disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)" }}>{t("message.send")}</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
