import OpenAI from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@docsy/shared';
import { retrieve, type Passage } from './retrieve';
import { SYSTEM_PROMPT, CONDENSE_PROMPT, buildUserMessage, citedIndexes } from './prompt';

export const ANSWER_MODEL = 'gpt-4o-mini';

let client: OpenAI | null = null;
function openai(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set.');
  client ??= new OpenAI({ apiKey });
  return client;
}

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export interface Citation {
  index: number;
  title: string | null;
  headingPath: string | null;
  url: string | null;
}

/** Only the last few turns matter, and they keep the condense call cheap. */
const HISTORY_TURNS = 6;

export async function condense(question: string, history: Turn[]): Promise<string> {
  if (history.length === 0) return question;

  const response = await openai().chat.completions.create({
    model: ANSWER_MODEL,
    temperature: 0,
    max_tokens: 120,
    messages: [
      { role: 'system', content: CONDENSE_PROMPT },
      ...history.slice(-HISTORY_TURNS),
      { role: 'user', content: question },
    ],
  });

  return response.choices[0]?.message?.content?.trim() || question;
}

export interface AnswerStream {
  /** The passages given to the model, in citation order. */
  passages: Passage[];
  stream: AsyncIterable<string>;
  /** Resolves once the stream is fully consumed. */
  finish: () => { text: string; citations: Citation[]; wasAnswered: boolean };
}

/**
 * A sentinel is cheaper and more reliable than a second model call to decide
 * whether the question was answered, and it doubles as the visible wording.
 */
const NO_ANSWER = 'I could not find that in the documentation';

export async function answerQuestion(
  supabase: SupabaseClient<Database>,
  args: { botId: string; question: string; history: Turn[]; tone: string },
): Promise<AnswerStream> {
  const standalone = await condense(args.question, args.history);
  const passages = await retrieve(supabase, args.botId, standalone);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\nWhen the passages do not answer the question, begin your reply with exactly: "${NO_ANSWER}".`,
    },
    ...args.history.slice(-HISTORY_TURNS),
    { role: 'user', content: buildUserMessage(args.question, passages, args.tone) },
  ];

  const completion = await openai().chat.completions.create({
    model: ANSWER_MODEL,
    temperature: 0.2,
    max_tokens: 700,
    stream: true,
    messages,
  });

  let text = '';

  async function* iterate() {
    for await (const part of completion) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) {
        text += delta;
        yield delta;
      }
    }
  }

  return {
    passages,
    stream: iterate(),
    finish() {
      const wasAnswered = !text.trimStart().startsWith(NO_ANSWER) && passages.length > 0;
      const citations: Citation[] = citedIndexes(text)
        .map((index) => {
          const passage = passages[index - 1];
          return passage
            ? {
                index,
                title: passage.title,
                headingPath: passage.headingPath,
                url: passage.url,
              }
            : null;
        })
        .filter((citation): citation is Citation => citation !== null);

      return { text, citations, wasAnswered };
    },
  };
}
