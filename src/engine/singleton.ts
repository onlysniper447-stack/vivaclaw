/** One instance per Node process, including Next.js dev route bundles. */
export function singleton<T>(key: string, create: () => T): T {
  const holder = globalThis as typeof globalThis & { __hettnet?: Record<string, unknown> };
  if (!holder.__hettnet) holder.__hettnet = {};
  const existing = holder.__hettnet[key];
  if (existing !== undefined) return existing as T;
  const created = create();
  holder.__hettnet[key] = created;
  return created;
}
