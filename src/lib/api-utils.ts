
export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class FetchError extends Error {
  status?: number;
  statusText?: string;

  constructor(message: string, status?: number, statusText?: string) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.statusText = statusText;
  }
}

export async function fetchWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  const {
    timeout = 10000,
    retries = 3,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  let lastError: any;

  for (let i = 0; i < retries + 1; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Combine abort signals if user passed one
    const signal = fetchOptions.signal
      ? anySignal([controller.signal, fetchOptions.signal as AbortSignal])
      : controller.signal;

    try {
      const response = await fetch(url, { ...fetchOptions, signal });
      clearTimeout(timeoutId);

      // If server error (5xx), throw to trigger retry
      if (response.status >= 500) {
        throw new FetchError(`Server error: ${response.status}`, response.status, response.statusText);
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      // Don't retry if aborted by user
      if (error.name === 'AbortError' && fetchOptions.signal?.aborted) {
        throw error;
      }

      // If last attempt, throw
      if (i === retries) break;

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, i))); // Exponential backoff
    }
  }

  throw lastError;
}

// Helper for combining signals (since AbortSignal.any is not supported in all envs yet)
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  return controller.signal;
}
