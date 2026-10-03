export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function isNonRetryable(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "noRetry" in error && error.noRetry);
}

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  retries = 2,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      last = error;
      if (attempt === retries || isNonRetryable(error)) break;
      await delay(200 * 2 ** attempt);
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}
