import { encode } from 'gpt-tokenizer';

/**
 * Splits a markdown document into embeddable chunks.
 *
 * Two rules drive the design and both come from the niche:
 *
 * 1. Chunks follow the heading structure, and each one records the path of
 *    headings above it. That path is what a citation shows the reader, so a
 *    chunk that has lost it can be retrieved but not attributed.
 * 2. Fenced code blocks and tables are never split. In dev-tools docs the code
 *    *is* the answer; half a snippet is worse than none.
 */

export interface Chunk {
  content: string;
  /** e.g. 'Getting Started > Installation > Docker' */
  headingPath: string;
  tokenCount: number;
}

const TARGET_TOKENS = 700;
const MAX_TOKENS = 900;
const MIN_TOKENS = 40;
/** Roughly 10% of the target, carried from the end of the previous chunk. */
const OVERLAP_TOKENS = 70;

const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^\s*(```|~~~)/;

function countTokens(text: string): number {
  return encode(text).length;
}

/** Atomic pieces: a fenced block, a table, or a paragraph. */
interface Block {
  text: string;
  headingPath: string;
  /** Never split, whatever its size. */
  atomic: boolean;
}

function splitIntoBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  const headings: string[] = [];
  let buffer: string[] = [];
  let inFence = false;
  let fenceMarker = '';

  const flush = (atomic = false) => {
    const text = buffer.join('\n').trim();
    buffer = [];
    if (text) blocks.push({ text, headingPath: headings.join(' > '), atomic });
  };

  for (const line of lines) {
    const fence = line.match(FENCE);

    if (inFence) {
      buffer.push(line);
      if (fence && fence[1] === fenceMarker) {
        inFence = false;
        flush(true);
      }
      continue;
    }

    if (fence) {
      flush();
      inFence = true;
      fenceMarker = fence[1] ?? '```';
      buffer.push(line);
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      flush();
      const level = heading[1]?.length ?? 1;
      const title = (heading[2] ?? '').trim();
      headings.length = Math.max(0, level - 1);
      headings[level - 1] = title;
      // The heading itself leads the next block, so a chunk reads in context.
      buffer.push(line);
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }

    buffer.push(line);
  }

  // An unterminated fence still holds real content; keep it rather than drop it.
  if (inFence) flush(true);
  else flush();

  return blocks;
}

/** Splits an oversized non-atomic block on sentence boundaries. */
function splitLongBlock(block: Block): Block[] {
  const sentences = block.text.split(/(?<=[.!?])\s+/);
  const parts: Block[] = [];
  let current: string[] = [];

  for (const sentence of sentences) {
    const candidate = [...current, sentence].join(' ');
    if (current.length > 0 && countTokens(candidate) > MAX_TOKENS) {
      parts.push({ ...block, text: current.join(' ') });
      current = [sentence];
    } else {
      current.push(sentence);
    }
  }
  if (current.length > 0) parts.push({ ...block, text: current.join(' ') });
  return parts;
}

function tailOverlap(text: string): string {
  const tokens = encode(text);
  if (tokens.length <= OVERLAP_TOKENS) return text;
  // Cut on a sentence boundary near the tail so the overlap reads as prose.
  const approxChars = Math.floor(text.length * (OVERLAP_TOKENS / tokens.length));
  const tail = text.slice(-approxChars);
  const boundary = tail.search(/(?<=[.!?])\s/);
  return boundary === -1 ? tail.trim() : tail.slice(boundary).trim();
}

export function chunkMarkdown(markdown: string): Chunk[] {
  const blocks = splitIntoBlocks(markdown).flatMap((block) =>
    !block.atomic && countTokens(block.text) > MAX_TOKENS ? splitLongBlock(block) : [block],
  );

  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentPath = '';
  let currentTokens = 0;

  const commit = () => {
    const content = current.join('\n\n').trim();
    if (!content) return;
    chunks.push({ content, headingPath: currentPath, tokenCount: countTokens(content) });
  };

  for (const block of blocks) {
    const blockTokens = countTokens(block.text);
    const pathChanged = currentPath !== '' && block.headingPath !== currentPath;
    const wouldOverflow = currentTokens + blockTokens > TARGET_TOKENS;

    if (current.length > 0 && (pathChanged || wouldOverflow)) {
      commit();
      const overlap = pathChanged ? '' : tailOverlap(current.join('\n\n'));
      current = overlap ? [overlap] : [];
      currentTokens = overlap ? countTokens(overlap) : 0;
    }

    current.push(block.text);
    currentPath = block.headingPath;
    currentTokens += blockTokens;
  }
  commit();

  // A trailing scrap — a lone heading, a one-line footer — carries no meaning
  // on its own and only dilutes retrieval.
  return chunks.filter((chunk, index) => chunk.tokenCount >= MIN_TOKENS || index === 0);
}
