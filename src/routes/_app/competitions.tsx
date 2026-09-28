import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useLang, countryName } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRIES } from "@/lib/countries";
import { nextRound, type Round } from "@/lib/competitions";

export const Route = createFileRoute("/_app/competitions")({
  head: () => ({ meta: [
    { title: "Compete — Majorka Racing" },
    { name: "description", content: "Racing series and championships you can enter across Latvia, Estonia and Lithuania." },
    { property: "og:title", content: "Compete — Majorka Racing" },
    { property: "og:description", content: "Racing series and championships you can enter across Latvia, Estonia and Lithuania." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CompetitionsPage,
});

function CompetitionsPage() {
  const { t } = useLang();
  const [rows, setRows] = useState<any[] | null>(null);
  const [country, setCountry] = useState("all");
  const [beginner, setBeginner] = useState(false);

  useEffect(() => {
    supabase.from("competitions").select("id,slug,name,discipline,country,season,rounds,beginner_friendly")
      .eq("status", "live").order("sort").then(({ data }) => setRows(data ?? []));
  }, []);

  const list = useMemo(() => (rows ?? []).filter((c) =>
    (country === "all" || c.country === country) && (!beginner || c.beginner_friendly)), [rows, country, beginner]);

  const chip = (active: boolean) => ({
    backgroundColor: active ? "var(--accent)" : "var(--card)",
    color: active ? "var(--accent-foreground)" : "var(--foreground)",
    borderColor: active ? "var(--accent)" : "var(--border)",
  });

  return (
    <main className="container-app py-6 space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold">{t("compete.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("compete.subtitle")}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {[{ value: "all", label: t("common.all") }, ...COUNTRIES.map((c) => ({ value: c.value, label: countryName(t, c.value) }))].map((c) => (
          <button key={c.value} onClick={() => setCountry(c.value)} className="px-4 h-9 rounded-full text-sm font-medium border" style={chip(country === c.value)}>
            {c.label}
          </button>
        ))}
        <button onClick={() => setBeginner(!beginner)} className="px-4 h-9 rounded-full text-sm font-medium border" style={chip(beginner)}>
          {t("compete.beginner")}
        </button>
      </div>
      {rows === null ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">{t("compete.none")}</p>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const r = nextRound(c.rounds as Round[]);
            return (
              <Link key={c.id} to="/competitions/$slug" params={{ slug: c.slug }}
                className="block bg-card border border-border rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{c.name}</p>
                  <span className="text-xs whitespace-nowrap">{countryName(t, c.country)}</span>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="category-pill">{c.discipline}</span>
                  {c.beginner_friendly && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }}>
                      {t("compete.beginner")}
                    </span>
                  )}
                </div>
                {c.season && <p className="text-xs text-muted-foreground">{t("compete.season")}: {c.season}</p>}
                {r && <p className="text-xs text-muted-foreground">{t("compete.nextRound")}: {r.date}{r.venue ? ` · ${r.venue}` : ""}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
