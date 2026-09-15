import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@docsy/shared';
import { embedOne } from '@/lib/ingest/embed';

export interface Passage {
  chunkId: string;
  content: string;
  headingPath: string | null;
  documentId: string;
  title: string | null;
  url: string | null;
  score: number;
}

/** Roughly how much context the answer model is given. */
const CONTEXT_TOKEN_BUDGET = 3_000;
/** Cheap enough and close enough for a budget check. */
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export async function retrieve(
  supabase: SupabaseClient<Database>,
  botId: string,
  query: string,
  matchCount = 6,
): Promise<Passage[]> {
  const embedding = await embedOne(query);

  const { data, error } = await supabase.rpc('match_chunks', {
    p_bot_id: botId,
    p_query_embedding: JSON.stringify(embedding) as never,
    p_query_text: query,
    p_match_count: matchCount,
  });

  if (error) throw new Error('Search failed.');

  const passages: Passage[] = (data ?? []).map((row) => ({
    chunkId: row.chunk_id,
    content: row.content,
    headingPath: row.heading_path,
    documentId: row.document_id,
    title: row.document_title,
    url: row.document_url,
    score: row.score,
  }));

  // Neighbouring chunks of one page repeat their heading and often overlap, so
  // keeping every one of them spends the budget on the same words twice.
  const seenDocuments = new Map<string, number>();
  const trimmed: Passage[] = [];
  let tokens = 0;

  for (const passage of passages) {
    const fromSameDocument = seenDocuments.get(passage.documentId) ?? 0;
    if (fromSameDocument >= 3) continue;

    const cost = estimateTokens(passage.content);
    if (tokens + cost > CONTEXT_TOKEN_BUDGET && trimmed.length > 0) break;

    trimmed.push(passage);
    seenDocuments.set(passage.documentId, fromSameDocument + 1);
    tokens += cost;
  }

  return trimmed;
}
