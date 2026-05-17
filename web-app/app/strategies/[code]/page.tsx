import { notFound } from "next/navigation";
import { MarketDetail } from "@/components/strategies/market-detail";
import { MARKETS } from "@/lib/contracts";

// /strategies/[code] — per-market detail page. `code` is the lower-case
// ISO-3 (ars / brl / mxn). Anything else 404s.
//
// Renders both issuer routes (Ripio + Twin) with deeper stats, a routing
// explainer sidebar, the vanilla baseline (when one exists for the market),
// and the six-market capital efficiency visual. The page itself stays a
// thin server wrapper — heavy lifting is in components/strategies/market-detail.

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const market = MARKETS.find(
    (m) => m.code.toLowerCase() === code.toLowerCase(),
  );
  if (!market) notFound();
  return <MarketDetail market={market} />;
}

// Pre-render the three known market codes at build time. SSG keeps the
// detail pages fast + crawlable; clients still get the live RouteDetail
// balances via wagmi after hydration.
export function generateStaticParams() {
  return MARKETS.map((m) => ({ code: m.code.toLowerCase() }));
}
