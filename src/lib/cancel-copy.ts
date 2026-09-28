import type { TranslationKey } from "@/i18n/en";

type T = (k: TranslationKey, v?: Record<string, string | number>) => string;

export interface CancelInfo {
  title: string;
  date: string;
  time: string | null;
  price: number;
  deposit: number | null;
  totalPaid: number;
  platformFee: number;
}

/** Prompt + success toast for cancelling, based on price, deposit and hours until the event. */
export function cancelCopy(t: T, b: CancelInfo): { prompt: string; toast: string } {
  const free = Number(b.price) === 0 || Number(b.totalPaid) === 0;
  if (free) return { prompt: t("booking.cancelFree", { title: b.title }), toast: t("booking.cancelledFreeToast") };
  const hours = (new Date(`${b.date}T${b.time ?? "00:00"}`).getTime() - Date.now()) / 36e5;
  const isDeposit = Number(b.deposit ?? 0) > 0 && Number(b.deposit) < Number(b.price);
  if (hours < 48) return { prompt: t("booking.cancelNoRefund"), toast: t("booking.cancelledNoRefundToast") };
  const amount = Math.max(0, Number(b.totalPaid) - Number(b.platformFee ?? 0)).toFixed(2);
  return {
    prompt: t("booking.cancelRefund", { kind: t(isDeposit ? "booking.kindDeposit" : "booking.kindPayment"), amount }),
    toast: t("booking.cancelledRefundToast"),
  };
}
