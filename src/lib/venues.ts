import type { VenueFamily, VenueId } from "@/types/hettnet";

export function venueLabel(venue: VenueId): string {
  switch (venue) {
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
  if (venue === "hyperswap" || venue === "kittenswap" || venue === "projectx") {
    return "lp";
  }
  return "lend";
}

export function venueSource(venue: VenueId): string {
  switch (venue) {
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
