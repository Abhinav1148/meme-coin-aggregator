import axios, { AxiosError } from 'axios';
import logger from './logger';

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableStatusCodes?: number[];
}

const defaultConfig: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, retryableStatusCodes } = {
    ...defaultConfig,
    ...config,
  };

  let lastError: Error | AxiosError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error | AxiosError;

      if (attempt === maxRetries) {
        break;
      }

      const isRetryable =
        axios.isAxiosError(error) &&
        error.response &&
        retryableStatusCodes.includes(error.response.status);

      if (!isRetryable && !axios.isAxiosError(error)) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
      logger.warn(
        `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`,
        { error: axios.isAxiosError(error) ? error.message : String(error) }
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

