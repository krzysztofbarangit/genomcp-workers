/**
 * Batch fetching utilities for optimized parallel requests
 */

export interface BatchOptions {
  concurrency?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Execute array of async functions with concurrency limit
 */
export async function batchExecute<T>(
  tasks: (() => Promise<T>)[],
  options: BatchOptions = {}
): Promise<T[]> {
  const {
    concurrency = 5,
    retries = 3,
    retryDelay = 1000
  } = options;

  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    const promise = executeWithRetry(task, retries, retryDelay)
      .then(result => {
        results[i] = result;
      })
      .catch(error => {
        console.error(`Task ${i} failed after ${retries} retries:`, error);
        throw error;
      });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delay: number
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;

    await new Promise(resolve => setTimeout(resolve, delay));
    return executeWithRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Batch array into chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deduplicate array of items
 */
export function deduplicate<T>(array: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
