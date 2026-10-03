interface Entry<T> {
  value: T;
  exp: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const task = load()
    .then((value) => {
      store.set(key, { value, exp: Date.now() + ttlMs });
      inflight.delete(key);
      return value;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, task);
  return task;
}

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit || hit.exp <= Date.now()) return undefined;
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, exp: Date.now() + ttlMs });
}
