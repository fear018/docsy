/**
 * Groups the questions a bot could not answer.
 *
 * The same gap arrives worded a dozen ways — "how do I reset my password",
 * "password reset?", "I forgot my password". Listed separately they look like
 * twelve small problems; grouped, they are one obvious thing to write about,
 * which is the whole point of the report.
 *
 * Grouping is done on normalised text rather than embeddings: it is free,
 * instant and produces the same answer twice. Embedding every unanswered
 * question would cost money on a report the owner may open daily, and would
 * still need a threshold nobody can justify.
 */

/** Words that carry no topic and only stop near-identical questions matching. */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'do',
  'does',
  'did',
  'can',
  'could',
  'will',
  'would',
  'should',
  'shall',
  'may',
  'might',
  'must',
  'i',
  'you',
  'we',
  'they',
  'it',
  'my',
  'your',
  'our',
  'their',
  'me',
  'us',
  'them',
  'to',
  'of',
  'in',
  'on',
  'at',
  'for',
  'with',
  'from',
  'by',
  'about',
  'how',
  'what',
  'when',
  'where',
  'why',
  'who',
  'which',
  'there',
  'here',
  'and',
  'or',
  'but',
  'if',
  'then',
  'than',
  'that',
  'this',
  'these',
  'those',
  'please',
  'help',
  'get',
  'got',
  'have',
  'has',
  'had',
  'want',
  'need',
  'any',
  'some',
  'so',
  'just',
]);

/** Crude but predictable: enough to fold plurals and simple verb endings. */
function stem(word: string): string {
  return word
    .replace(/(ies)$/, 'y')
    .replace(/(sses|shes|ches|xes)$/, '')
    .replace(/([^s])s$/, '$1')
    .replace(/(ing|ed)$/, '');
}

export function tokens(question: string): string[] {
  const words = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word))
    .map(stem)
    .filter(Boolean);
  return [...new Set(words)].sort();
}

export function signature(question: string): string {
  // Sorted so word order does not split a group: "reset password" and
  // "password reset" are the same question.
  return tokens(question).join(' ');
}

/**
 * Share of meaningful words two questions have in common.
 *
 * Exact matching on the word set was the first attempt and it was too strict:
 * "password reset" and "I forgot my password, how do I reset it?" differ by one
 * word and stayed apart, which defeats the report. Two thirds shared is the
 * threshold — enough that "reset password" and "delete account" never merge.
 */
export function overlap(a: string[], b: string[]): number {
  // Two questions made entirely of filler share nothing meaningful; treating
  // that as a perfect match would collapse the whole report into one row.
  if (a.length === 0 || b.length === 0) return 0;
  const bSet = new Set(b);
  const shared = a.filter((word) => bSet.has(word)).length;
  return shared / (a.length + b.length - shared);
}

const MERGE_THRESHOLD = 0.6;

export interface UnansweredQuestion {
  content: string;
  createdAt: string;
  channel: 'app' | 'widget';
}

export interface Gap {
  /** The wording shown to the owner: the most recent phrasing. */
  question: string;
  count: number;
  lastAsked: string;
  /** Other phrasings folded into this group, most recent first. */
  variants: string[];
  fromWidget: number;
}

export function groupGaps(questions: UnansweredQuestion[]): Gap[] {
  // Greedy clustering: each question joins the first group it is close enough
  // to. Order-dependent in principle, stable in practice because the report is
  // always built from the same rows in the same order.
  const groups: { words: string[]; members: UnansweredQuestion[] }[] = [];

  const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

  for (const question of questions) {
    const words = tokens(question.content);
    const home = groups.find((group) =>
      words.length === 0
        ? // Nothing meaningful to compare: fold only on identical wording.
          group.words.length === 0 &&
          normalise(group.members[0]!.content) === normalise(question.content)
        : overlap(group.words, words) >= MERGE_THRESHOLD,
    );
    if (home) {
      home.members.push(question);
      // Keep the shared core so a group does not drift as it grows.
      const wordSet = new Set(words);
      home.words = home.words.filter((word) => wordSet.has(word));
    } else {
      groups.push({ words, members: [question] });
    }
  }

  return groups
    .map(({ members }) => members)
    .map((members) => {
      const sorted = [...members].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const wordings = [...new Set(sorted.map((member) => member.content.trim()))];
      return {
        question: wordings[0] ?? '',
        count: members.length,
        lastAsked: sorted[0]?.createdAt ?? '',
        variants: wordings.slice(1),
        fromWidget: members.filter((member) => member.channel === 'widget').length,
      };
    })
    .sort((a, b) => b.count - a.count || b.lastAsked.localeCompare(a.lastAsked));
}
