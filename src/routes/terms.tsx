import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Majorka Racing" },
      { name: "description", content: "Terms governing the use of the Majorka Racing motorsport booking platform." },
      { property: "og:title", content: "Terms of Service — Majorka Racing" },
      { property: "og:description", content: "Terms governing the use of the Majorka Racing motorsport booking platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="container-app py-6 pb-20 max-w-2xl">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground mb-6">
        <ArrowLeft size={20} /> Back
      </Link>
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="text-xs text-muted-foreground mt-1 mb-6">Last updated: September 2026</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <Section title="1. About Majorka Racing">
          Majorka Racing is a marketplace platform that connects car enthusiasts with event organisers. Majorka Racing is not an event organiser and does not operate any events. All events listed on Majorka Racing are operated by independent third-party organisers.
        </Section>
        <Section title="2. Bookings">
          When you book an event through Majorka Racing, you enter into a contract with the event organiser, not with Majorka Racing. Majorka Racing facilitates the transaction and charges a 5% platform fee on each booking. This fee is non-refundable.
        </Section>
        <Section title="3. Liability">
          All liability for event safety, insurance, and legal compliance rests entirely with the event organiser. By accepting the liability waiver at checkout, you confirm that you participate in events at your own risk. Majorka Racing accepts no liability for any injury, damage, or loss arising from attendance at any event.
        </Section>
        <Section title="4. Cancellations and Refunds">
          Users may cancel a booking up to 2 hours before the event start time. A full refund of the ticket price will be issued within 5-10 business days. The 5% platform fee is non-refundable. Refunds are processed to the original payment method via Stripe.
        </Section>
        <Section title="5. Organiser Responsibilities">
          Event organisers are responsible for: accurate event listings, appropriate insurance and safety measures, compliance with all applicable laws, and notifying attendees of any event changes or cancellations.
        </Section>
        <Section title="6. Account Termination">
          Majorka Racing reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or cause harm to other users.
        </Section>
        <Section title="7. Governing Law">
          These terms are governed by the laws of the Republic of Latvia.
        </Section>
        <Section title="8. Contact">
          For any questions: hello@majorkaracing.com
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
