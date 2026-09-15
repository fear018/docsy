import OpenAI from 'openai';

/**
 * Embedding is the only step that costs money per call, so it is batched,
 * retried, and skipped entirely for content whose hash has not changed.
 */

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/** The API caps inputs per request; well under it keeps latency predictable. */
const BATCH_SIZE = 96;
const MAX_ATTEMPTS = 4;

let client: OpenAI | null = null;

function openai(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');
  client ??= new OpenAI({ apiKey });
  return client;
}

function isRetryable(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  // Rate limits and server faults are worth another attempt; a 400 never is.
  return status === 408 || status === 409 || status === 429 || (status ?? 0) >= 500;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function embedBatch(inputs: string[]): Promise<number[][]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await openai().embeddings.create({
        model: EMBEDDING_MODEL,
        input: inputs,
      });
      // The API preserves input order, but sorting by index makes that explicit
      // rather than assumed — a misaligned vector is a silently wrong answer.
      return response.data
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS) break;
      await wait(2 ** attempt * 250);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Embedding request failed.');
}

/** Embeds every input, in order, a batch at a time. */
export async function embedAll(inputs: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let start = 0; start < inputs.length; start += BATCH_SIZE) {
    vectors.push(...(await embedBatch(inputs.slice(start, start + BATCH_SIZE))));
  }
  return vectors;
}

export async function embedOne(input: string): Promise<number[]> {
  const [vector] = await embedBatch([input]);
  if (!vector) throw new Error('Embedding request returned nothing.');
  return vector;
}
