import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const base = { accessToken: z.string().min(1) };

async function caller(token: string) {
  const m = await import("./app-email.server");
  const user = await m.userFromToken(token);
  return { m, user };
}

export const emailBookingCreated = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ...base, bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { m, user } = await caller(data.accessToken);
      if (user) await m.sendBookingCreated(data.bookingId, user.id);
    } catch (e) { console.error("[email] booking created", e); }
    return { ok: true };
  });

export const emailBookingCancelled = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ...base, bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { m, user } = await caller(data.accessToken);
      if (user) await m.sendBookingCancelled(data.bookingId, user.id);
    } catch (e) { console.error("[email] booking cancelled", e); }
    return { ok: true };
  });

export const emailOrganiserApplication = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ...base, type: z.enum(["new_application", "approved", "rejected"]), applicationId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { m, user } = await caller(data.accessToken);
      if (user) await m.sendApplicationEmail(data.type, data.applicationId, user.id);
    } catch (e) { console.error("[email] organiser application", e); }
    return { ok: true };
  });

export const emailCompetitionEntry = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ...base, entryId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { m, user } = await caller(data.accessToken);
      if (user) await m.sendCompetitionEntry(data.entryId, user.id);
    } catch (e) { console.error("[email] competition entry", e); }
    return { ok: true };
  });

export const emailOrganiserRole = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ...base, userId: z.string().uuid(), on: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { m, user } = await caller(data.accessToken);
      if (user) return await m.sendOrganiserRoleEmail(data.userId, data.on, user.id);
      return { ok: false, sent: false, reason: "not signed in", name: "" };
    } catch (e: any) {
      console.error("[email] organiser role", e);
      return { ok: false, sent: false, reason: String(e?.message ?? "send failed"), name: "" };
    }
  });
