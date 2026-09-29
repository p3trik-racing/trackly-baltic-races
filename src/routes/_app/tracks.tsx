import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLang } from "@/i18n";
import { loadVenueCards, VenueCardView, type VenueCard } from "@/components/VenueCard";

export const Route = createFileRoute("/_app/tracks")({
  head: () => ({ meta: [
    { title: "Book a whole track — Majorka Racing" },
    { name: "description", content: "Rent a Baltic race track by the hour — book it whole or split the cost with other drivers." },
    { property: "og:title", content: "Book a whole track — Majorka Racing" },
    { property: "og:description", content: "Rent a Baltic race track by the hour — book it whole or split the cost with other drivers." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TracksPage,
});

function TracksPage() {
  const { t } = useLang();
  const [items, setItems] = useState<VenueCard[] | null>(null);
  useEffect(() => { loadVenueCards().then(setItems); }, []);
  return (
    <main className="container-app py-6 space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold">{t("tracks.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("tracks.subtitle")}</p>
      </div>
      {items === null ? <p className="text-sm text-muted-foreground text-center py-10">{t("common.loading")}</p>
        : items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">{t("tracks.empty")}</p>
        : <div className="grid gap-3 sm:grid-cols-2">{items.map((v) => <VenueCardView key={v.id} v={v} />)}</div>}
    </main>
  );
}
