import { notFound } from "next/navigation";
import { VanillaPoolDetail } from "@/components/strategies/vanilla-pool-detail";
import { FUJI_DEPLOYMENT, TOKENS } from "@/lib/contracts";

// /strategies/vanilla/[token] — per-pool detail for the two vanilla
// baselines (wars / wbrl). `token` is the lower-case symbol. Anything else
// 404s. Server wrapper resolves token → pool ID + sibling market metadata.

const VANILLA_INDEX = {
  wars: {
    token: TOKENS.wars,
    poolId: FUJI_DEPLOYMENT.pools.warsUsdcVanilla,
    marketCode: "ars" as const,
    marketLabel: "Argentine Peso",
    marketFlag: "🇦🇷",
  },
  wbrl: {
    token: TOKENS.wbrl,
    poolId: FUJI_DEPLOYMENT.pools.wbrlUsdcVanilla,
    marketCode: "brl" as const,
    marketLabel: "Brazilian Real",
    marketFlag: "🇧🇷",
  },
} as const;

export default async function VanillaPoolPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const entry =
    VANILLA_INDEX[token.toLowerCase() as keyof typeof VANILLA_INDEX];
  if (!entry) notFound();
  return <VanillaPoolDetail {...entry} />;
}

// Pre-render the two vanilla pool detail pages at build time.
export function generateStaticParams() {
  return Object.keys(VANILLA_INDEX).map((token) => ({ token }));
}
