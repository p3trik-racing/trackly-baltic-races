import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { useLang } from "@/i18n";
import { ChevronRight, Copy, MessageCircle, Send, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, type ReactNode } from "react";

const rowCls = "flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-card border border-border text-sm font-medium text-left";

function Row({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={rowCls}>
      {icon}<span className="flex-1">{label}</span><ChevronRight size={16} className="text-muted-foreground" />
    </button>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function ShareSheet({ open, onOpenChange, url, text, title, inviteText }: {
  open: boolean; onOpenChange: (o: boolean) => void; url: string; text: string; title: string; inviteText?: string;
}) {
  const { t } = useLang();
  const [canNative, setCanNative] = useState(false);
  useEffect(() => { setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);

  const openWin = (href: string) => { window.open(href, "_blank", "noopener"); onOpenChange(false); };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("share.title")}</DrawerTitle>
          <DrawerDescription className="truncate">{title}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8 space-y-2">
          {inviteText && (
            <Row icon={<UserPlus size={18} />} label={t("friends.inviteFriend")}
              onClick={async () => {
                if (canNative) { try { await navigator.share({ title, text: inviteText, url }); } catch {} }
                else openWin(`https://wa.me/?text=${encodeURIComponent(`${inviteText} ${url}`)}`);
                onOpenChange(false);
              }} />
          )}
          <Row icon={<MessageCircle size={18} />} label={t("share.whatsapp")}
            onClick={() => openWin(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`)} />
          <Row icon={<Send size={18} />} label={t("share.telegram")}
            onClick={() => openWin(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`)} />
          <Row icon={<Copy size={18} />} label={t("share.copy")}
            onClick={async () => { if (await copyText(url)) toast.success(t("share.copied")); onOpenChange(false); }} />
          {canNative && (
            <Row icon={<Share2 size={18} />} label={t("share.more")}
              onClick={async () => { try { await navigator.share({ title, text, url }); } catch {} onOpenChange(false); }} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
