export const CONSOLE_NEVER_SIGNS =
  "Indications are informational, not financial advice. The console never signs, sends, or broadcasts. HyperEVM chain 998.";

/** Visible header chips. Execution never signs; Testnet is the live network lock. */
export const CONSOLE_STATUS_CHIPS = [{ label: "Testnet", tooltip: CONSOLE_NEVER_SIGNS }] as const;
