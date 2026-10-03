/**
 * Live discovery smoke. Run with `npm run smoke:hl`.
 * Prints adapter counts. Never invents a rate.
 */
import { discoverOpportunities, fetchHyperCoreOpportunities, simulateSupplyApy } from "./index";

async function main() {
  const core = await fetchHyperCoreOpportunities();
  const usdc = core.find((row) => row.id === "hypercore:lend:0");
  if (!usdc || usdc.utilization === null || usdc.tvl === null) {
    throw new Error("HyperCore USDC reserve missing");
  }
  const sim = simulateSupplyApy({
    totalSupplied: usdc.tvl,
    totalBorrowed: usdc.tvl * usdc.utilization,
    additionalSupply: usdc.tvl * 0.02,
  });
  console.log(
    JSON.stringify(
      {
        hypercore: core.length,
        usdcSupplyApy: usdc.apyTotal,
        usdcUtil: usdc.utilization,
        kinkWarning: sim.nearKink,
        modeled: sim.currentSupplyApy,
      },
      null,
      2,
    ),
  );

  const discovered = await discoverOpportunities();
  const byVenue = new Map<string, number>();
  for (const opp of discovered.opportunities) {
    byVenue.set(opp.venue, (byVenue.get(opp.venue) ?? 0) + 1);
  }
  console.log(
    JSON.stringify(
      {
        total: discovered.opportunities.length,
        errors: discovered.errors,
        byVenue: Object.fromEntries(byVenue),
        verified: discovered.opportunities.filter((row) => row.verified).length,
        sample: discovered.opportunities.slice(0, 8).map((row) => ({
          id: row.id,
          venue: row.venue,
          apyTotal: row.apyTotal,
          apr: row.apr,
          tvl: row.tvl,
          verified: row.verified,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
