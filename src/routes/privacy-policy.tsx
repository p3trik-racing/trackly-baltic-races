import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Trackly" },
      { name: "description", content: "How Trackly collects, uses, and protects your personal data." },
    ],
  }),
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
  return (
    <main className="container-app py-6 pb-20 max-w-2xl">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground mb-6">
        <ArrowLeft size={20} /> Back
      </Link>
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground mt-1 mb-6">Last updated: May 2025</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <Section title="1. Who We Are">
          Trackly (trackly.racing) is a motorsport event discovery and booking platform operated as a marketplace connecting car enthusiasts with event organisers across Latvia and the Baltic States.
        </Section>
        <Section title="2. Data We Collect">
          When you create an account: name, email address, phone number, and username. When you make a booking: attendee details, payment information (processed by Stripe — we never store card details), and your acceptance of the event liability waiver. Usage data: pages visited, events browsed, and booking history.
        </Section>
        <Section title="3. How We Use Your Data">
          To process bookings and payments. To send booking confirmations and event reminders. To show you relevant events based on your preferences. To allow event organisers to contact attendees in case of event changes.
        </Section>
        <Section title="4. Who We Share Your Data With">
          Event organisers receive your name, email, and phone number when you book their event. Stripe processes your payment data under their own privacy policy. We do not sell your data to any third parties.
        </Section>
        <Section title="5. Your Rights (GDPR)">
          You have the right to access, correct, or delete your personal data at any time. To delete your account and all associated data, go to Profile → Delete account. For any data requests, contact: privacy@trackly.racing.
        </Section>
        <Section title="6. Data Retention">
          Booking records are retained for 7 years for legal and tax compliance. Account data is deleted within 30 days of account deletion.
        </Section>
        <Section title="7. Cookies">
          We use only essential cookies required for login session management. No tracking or advertising cookies are used.
        </Section>
        <Section title="8. Contact">
          For privacy questions: privacy@trackly.racing
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold mb-2">{title}</h2>
      <p className="text-muted-foreground">{children}</p>
    </section>
  );
}
