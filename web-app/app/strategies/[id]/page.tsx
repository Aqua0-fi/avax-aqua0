import { notFound } from "next/navigation";
import { StrategyDetail } from "@/components/strategies/strategy-detail";
import { STRATEGIES } from "@/lib/contracts";

// /strategies/[id] — unified per-strategy detail page. Anything not in
// STRATEGIES 404s. The detail component branches internally on kind so
// Aqua0 pools get the DeployLiquidityCard + amplified-depth framing while
// vanilla baselines stay dim + comparison-only.

export default async function StrategyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const strategy = STRATEGIES.find((s) => s.id === id.toLowerCase());
  if (!strategy) notFound();
  return <StrategyDetail strategy={strategy} />;
}

// SSG: pre-render every known strategy at build time. New strategies added
// to STRATEGIES will automatically pick up a static page.
export function generateStaticParams() {
  return STRATEGIES.map((s) => ({ id: s.id }));
}
