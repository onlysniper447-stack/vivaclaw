import { PublicKey } from "@solana/web3.js";

export { shortenAddress } from "./shorten";

export function parsePublicKey(raw: string | null | undefined): PublicKey | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return new PublicKey(trimmed);
  } catch {
    return null;
  }
}
