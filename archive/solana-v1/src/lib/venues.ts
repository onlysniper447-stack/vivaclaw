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
  }
}

export function venueFamily(venue: VenueId): VenueFamily {
  return venue === "kamino" || venue === "meteora" ? "lend" : "lp";
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
  }
}
