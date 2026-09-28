import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";

// Renders the check-in pass QR (used as an image in booking emails). Only encodes our own pass URL.
export const Route = createFileRoute("/api/public/qr/$bookingId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const c = new URL(request.url).searchParams.get("c") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(params.bookingId) || !/^[A-Za-z0-9]{8}$/.test(c)) {
          return new Response("Bad request", { status: 400 });
        }
        const url = `https://majorkaracing.com/checkin/${params.bookingId}?c=${c}`;
        const buf = await QRCode.toBuffer(url, { errorCorrectionLevel: "M", margin: 2, width: 440, type: "png" });
        return new Response(new Uint8Array(buf), {
          headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
        });
      },
    },
  },
});
