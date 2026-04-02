interface RetryOptions {
  retries?: number;
  delayMs?: number;
  label?: string;
}

/**
 * Retries an async function with exponential backoff.
 * Throws the last error if all attempts are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, delayMs = 5000, label = 'operation' }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const wait = delayMs * attempt;
        console.warn(`[retry] ${label} failed (attempt ${attempt}/${retries}), retrying in ${wait}ms...`);
        await new Promise(resolve => setTimeout(resolve, wait));
      }
    }
  }

  console.error(`[retry] ${label} failed after ${retries} attempt(s)`);
  throw lastError;
}
