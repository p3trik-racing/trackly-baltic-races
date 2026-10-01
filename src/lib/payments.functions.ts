import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tok = z.string().min(1);
const uuid = z.string().uuid();
const pi = z.string().regex(/^pi_[A-Za-z0-9_]+$/).max(255);

async function s() { return import("./stripe.server"); }
async function wrap<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try { return { ok: true, data: await fn() }; } catch (e: any) { return { ok: false, error: e?.message ?? "Something went wrong" }; }
}

export const createConnectAccountLink = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: tok, country: z.enum(["LV", "EE", "LT"]).default("LV") }).parse(d))
  .handler(({ data }) => wrap(async () => { const m = await s(); const u = await m.requireUser(data.accessToken); return m.connectAccountLink(u.id, u.email, data.country); }));

export const refreshConnectStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: tok }).parse(d))
  .handler(({ data }) => wrap(async () => { const m = await s(); const u = await m.requireUser(data.accessToken); return m.connectStatus(u.id); }));

export const createConnectDashboardLink = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: tok }).parse(d))
  .handler(({ data }) => wrap(async () => { const m = await s(); const u = await m.requireUser(data.accessToken); return m.connectDashboardLink(u.id); }));

export const createItemPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: tok, kind: z.enum(["slot", "ticket"]), id: uuid }).parse(d))
  .handler(({ data }) => wrap(async () => {
    const m = await s(); const u = await m.requireUser(data.accessToken);
    return data.kind === "slot" ? m.createSlotPayment(data.id, u.id) : m.createTicketPayment(data.id, u.id);
  }));

export const confirmItemPayment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: tok, kind: z.enum(["slot", "ticket"]), id: uuid, paymentIntentId: pi }).parse(d))
  .handler(({ data }) => wrap(async () => {
    const m = await s(); const u = await m.requireUser(data.accessToken);
    return data.kind === "slot" ? m.confirmSlotPayment(data.id, u.id, data.paymentIntentId) : m.confirmTicketPayment(data.id, u.id, data.paymentIntentId);
  }));

export const cancelSlotBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: tok, id: uuid }).parse(d))
  .handler(({ data }) => wrap(async () => (await s()).cancelSlotWithRefund(data.accessToken, data.id)));

export const cancelRaceTicket = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: tok, id: uuid }).parse(d))
  .handler(({ data }) => wrap(async () => (await s()).cancelTicketWithRefund(data.accessToken, data.id)));

async function admin(token: string) {
  const m = await s(); const u = await m.requireUser(token);
  if (!(await m.hasRole(u.id, "admin"))) throw new Error("Admins only");
  return m;
}
export const adminPaymentsOverview = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: tok }).parse(d))
  .handler(({ data }) => wrap(async () => (await admin(data.accessToken)).adminPayments()));

export const adminEnableApplePay = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ accessToken: tok }).parse(d))
  .handler(({ data }) => wrap(async () => (await admin(data.accessToken)).enableApplePayDomain()));
