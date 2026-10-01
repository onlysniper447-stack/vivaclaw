/** One instance per Node process, including Next.js dev route bundles. */
export function singleton<T>(key: string, create: () => T): T {
  const holder = globalThis as typeof globalThis & { __vivaclaw?: Record<string, unknown> };
  if (!holder.__vivaclaw) holder.__vivaclaw = {};
  const existing = holder.__vivaclaw[key];
  if (existing !== undefined) return existing as T;
  const created = create();
  holder.__vivaclaw[key] = created;
  return created;
}
