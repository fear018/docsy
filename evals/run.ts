/**
 * Runs the answer-quality set and prints a score.
 *
 * Grading is deterministic: an LLM judge costs money on every run and drifts
 * between them, while these checks fail the same way twice. That matters more
 * than nuance, because the point is catching a regression after a prompt or
 * retrieval change — not measuring eloquence.
 *
 *   pnpm eval                 against the bot named in DOCSY_EVAL_BOT, or the
 *                             first bot found
 *   pnpm eval --save          write the run to evals/last-run.json for
 *                             comparison next time
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServiceClient } from '../apps/web/lib/supabase/service';
import { answerQuestion } from '../apps/web/lib/rag/answer';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The gate, not a target. Answers vary slightly between runs at a non-zero
 * temperature, so demanding a perfect score would fail on noise and train
 * everyone to ignore the result. A real regression moves several questions.
 */
const PASS_THRESHOLD = 0.9;

interface Question {
  q: string;
  answered: boolean;
  mustMention?: string[];
  /** How many of mustMention are enough; defaults to all of them. */
  minMentions?: number;
  mustNotMention?: string[];
  /** Substring expected in some citation's heading path, title or url. */
  expectSource?: string;
}

interface Outcome {
  question: string;
  ok: boolean;
  answeredOk: boolean;
  mentionsOk: boolean;
  sourceOk: boolean;
  latencyMs: number;
  detail: string;
}

const has = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.toLowerCase());

async function main() {
  const save = process.argv.includes('--save');
  const spec = JSON.parse(await readFile(join(here, 'questions.json'), 'utf8')) as {
    questions: Question[];
  };

  const supabase = createServiceClient();
  const wanted = process.env.DOCSY_EVAL_BOT;
  const query = supabase.from('bots').select('id, name, tone').limit(1);
  const { data: bot } = await (wanted ? query.eq('name', wanted) : query).maybeSingle();

  if (!bot) {
    console.error('No bot to evaluate. Index a source first, or set DOCSY_EVAL_BOT.');
    process.exit(1);
  }

  const { count } = await supabase
    .from('chunks')
    .select('id', { count: 'exact', head: true })
    .eq('bot_id', bot.id);

  console.log(`Bot: ${bot.name} — ${count ?? 0} chunks\n`);

  const outcomes: Outcome[] = [];

  for (const question of spec.questions) {
    const startedAt = Date.now();
    const { passages, stream, finish } = await answerQuestion(supabase, {
      botId: bot.id,
      question: question.q,
      history: [],
      tone: bot.tone,
    });

    for await (const _ of stream) {
      // Drain: finish() is only meaningful once the stream is consumed.
    }
    const { text, citations, wasAnswered } = finish();
    const latencyMs = Date.now() - startedAt;

    const answeredOk = wasAnswered === question.answered;

    const needed = question.minMentions ?? question.mustMention?.length ?? 0;
    const hits = (question.mustMention ?? []).filter((term) => has(text, term)).length;
    const forbidden = (question.mustNotMention ?? []).filter((term) => has(text, term));
    const mentionsOk = hits >= needed && forbidden.length === 0;

    const sourceOk =
      !question.expectSource ||
      citations.some((citation) =>
        has(
          [citation.headingPath, citation.title, citation.url].filter(Boolean).join(' '),
          question.expectSource!,
        ),
      );

    const ok = answeredOk && mentionsOk && sourceOk;
    const detail = [
      answeredOk ? null : `expected ${question.answered ? 'an answer' : 'a refusal'}`,
      mentionsOk ? null : forbidden.length ? `said ${forbidden.join(', ')}` : `missing terms`,
      sourceOk ? null : `no citation matching "${question.expectSource}"`,
    ]
      .filter(Boolean)
      .join('; ');

    outcomes.push({
      question: question.q,
      ok,
      answeredOk,
      mentionsOk,
      sourceOk,
      latencyMs,
      detail,
    });

    console.log(
      `${ok ? '  ok  ' : '  FAIL'}  ${String(latencyMs).padStart(5)}ms  ${question.q}` +
        (detail ? `\n           ${detail}` : ''),
    );
    if (!ok && passages.length === 0) console.log('           retrieval returned nothing');
  }

  const total = outcomes.length;
  const passed = outcomes.filter((outcome) => outcome.ok).length;
  const citationsOk = outcomes.filter((outcome) => outcome.sourceOk).length;
  const median = outcomes.map((o) => o.latencyMs).sort((a, b) => a - b)[Math.floor(total / 2)] ?? 0;

  console.log(
    `\n${passed}/${total} passed (${Math.round((passed / total) * 100)}%)  ` +
      `citations ${citationsOk}/${total}  median ${median}ms`,
  );

  const previousPath = join(here, 'last-run.json');
  try {
    const previous = JSON.parse(await readFile(previousPath, 'utf8')) as { passed: number };
    const delta = passed - previous.passed;
    if (delta !== 0) {
      console.log(`${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)} against the last saved run.`);
    } else {
      console.log('Unchanged against the last saved run.');
    }
  } catch {
    console.log('No saved run to compare against.');
  }

  if (save) {
    await writeFile(
      previousPath,
      `${JSON.stringify({ at: new Date().toISOString(), passed, total, outcomes }, null, 2)}\n`,
    );
    console.log('Saved.');
  }

  // Non-zero on a regression so this can gate a release.
  const ratio = passed / total;
  if (ratio < PASS_THRESHOLD) {
    console.log(`Below the ${Math.round(PASS_THRESHOLD * 100)}% gate.`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
