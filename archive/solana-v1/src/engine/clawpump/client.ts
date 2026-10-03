import { getServerEnv } from "@/lib/env";

export interface ClawPumpShareRequest {
  signature: string;
  profitAtomic: string;
  mint: string;
  opportunityId: string;
}

export interface ClawPumpShareResponse {
  accepted: boolean;
  shareAtomic: string;
  remainderAtomic: string;
  id?: string;
}

export async function reportFeeShare(
  body: ClawPumpShareRequest,
): Promise<ClawPumpShareResponse> {
  const env = getServerEnv();
  if (!env.CLAWPUMP_API_KEY) {
    const share = computeShare(body.profitAtomic, env.CLAWPUMP_FEE_BPS);
    return {
      accepted: false,
      shareAtomic: share,
      remainderAtomic: subtractAtomic(body.profitAtomic, share),
    };
  }

  const response = await fetch(`${env.CLAWPUMP_API_URL.replace(/\/$/, "")}/fees/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.CLAWPUMP_API_KEY}`,
    },
    body: JSON.stringify({
      ...body,
      feeBps: env.CLAWPUMP_FEE_BPS,
      cluster: env.AGENT_CLUSTER,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ClawPump share failed (${response.status}): ${text}`);
  }

  return (await response.json()) as ClawPumpShareResponse;
}

export function computeShare(profitAtomic: string, feeBps: number): string {
  const profit = BigInt(profitAtomic);
  return ((profit * BigInt(feeBps)) / 10_000n).toString();
}

function subtractAtomic(left: string, right: string): string {
  return (BigInt(left) - BigInt(right)).toString();
}
