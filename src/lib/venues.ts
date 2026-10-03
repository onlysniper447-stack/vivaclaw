import type { VenueFamily, VenueId } from "@/types/vivaclaw";

export function venueLabel(venue: VenueId): string {
  switch (venue) {
    case "kamino":
      return "Kamino";
    case "meteora":
      return "Meteora vault";
    case "meteora-dlmm":
      return "Meteora DLMM";
    case "meteora-damm":
      return "Meteora DAMM";
    case "raydium":
      return "Raydium";
    case "orca":
      return "Orca";
    case "hypercore":
      return "HyperCore";
    case "hyperlend":
      return "HyperLend";
    case "felix":
      return "Felix";
    case "morpho":
      return "Morpho";
    case "hyperswap":
      return "HyperSwap";
    case "kittenswap":
      return "Kittenswap";
    case "projectx":
      return "Project X";
  }
}

export function venueFamily(venue: VenueId): VenueFamily {
  if (
    venue === "kamino" ||
    venue === "meteora" ||
    venue === "hypercore" ||
    venue === "hyperlend" ||
    venue === "felix" ||
    venue === "morpho"
  ) {
    return "lend";
  }
  return "lp";
}

export function venueSource(venue: VenueId): string {
  switch (venue) {
    case "kamino":
      return "Kamino Lend main market";
    case "meteora":
      return "Meteora Dynamic Vault";
    case "meteora-dlmm":
      return "Meteora DLMM";
    case "meteora-damm":
      return "Meteora DAMM";
    case "raydium":
      return "Raydium";
    case "orca":
      return "Orca Whirlpool";
    case "hypercore":
      return "HyperCore native lend";
    case "hyperlend":
      return "HyperLend pooled market";
    case "felix":
      return "Felix Morpho vault";
    case "morpho":
      return "Morpho Blue vault";
    case "hyperswap":
      return "HyperSwap";
    case "kittenswap":
      return "Kittenswap Algebra";
    case "projectx":
      return "Project X";
  }
}
