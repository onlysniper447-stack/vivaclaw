/** Display helper only. Never constructs a signer. */

export function shortenAddress(address: string | null | undefined): string {
  if (!address) return "—";
  if (address.length < 12) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
