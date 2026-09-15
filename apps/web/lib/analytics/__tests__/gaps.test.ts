import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupGaps, signature, type UnansweredQuestion } from '../gaps';

const ask = (content: string, createdAt: string, channel: 'app' | 'widget' = 'widget') =>
  ({ content, createdAt, channel }) satisfies UnansweredQuestion;

describe('signature', () => {
  it('ignores word order', () => {
    assert.equal(signature('reset password'), signature('password reset'));
  });

  it('ignores punctuation, case and filler words', () => {
    assert.equal(signature('How do I reset my password?'), signature('password reset'));
  });

  it('folds simple plurals', () => {
    assert.equal(signature('webhook'), signature('webhooks'));
  });

  it('keeps genuinely different questions apart', () => {
    assert.notEqual(signature('reset password'), signature('delete account'));
  });
});

describe('groupGaps', () => {
  it('folds rephrasings into one row with a count', () => {
    const gaps = groupGaps([
      ask('How do I reset my password?', '2026-09-01T10:00:00Z'),
      ask('password reset', '2026-09-02T10:00:00Z'),
      ask('I forgot my password, how do I reset it?', '2026-09-03T10:00:00Z'),
    ]);

    assert.equal(gaps.length, 1, 'three phrasings, one gap');
    assert.equal(gaps[0]!.count, 3);
    assert.equal(gaps[0]!.variants.length, 2);
  });

  it('shows the most recent phrasing', () => {
    const gaps = groupGaps([
      ask('password reset', '2026-09-01T10:00:00Z'),
      ask('How do I reset my password?', '2026-09-05T10:00:00Z'),
    ]);
    assert.equal(gaps[0]!.question, 'How do I reset my password?');
  });

  it('ranks by how often a gap is hit', () => {
    const gaps = groupGaps([
      ask('delete account', '2026-09-01T10:00:00Z'),
      ask('password reset', '2026-09-02T10:00:00Z'),
      ask('reset the password', '2026-09-03T10:00:00Z'),
    ]);
    assert.equal(gaps[0]!.question, 'reset the password');
    assert.equal(gaps[0]!.count, 2);
    assert.equal(gaps[1]!.count, 1);
  });

  it('counts how many came from the widget rather than the owner testing', () => {
    const gaps = groupGaps([
      ask('billing limits', '2026-09-01T10:00:00Z', 'widget'),
      ask('limits on billing', '2026-09-02T10:00:00Z', 'app'),
    ]);
    assert.equal(gaps[0]!.count, 2);
    assert.equal(gaps[0]!.fromWidget, 1);
  });

  it('does not collapse everything when a question is only filler', () => {
    const gaps = groupGaps([
      ask('how do I?', '2026-09-01T10:00:00Z'),
      ask('what is it', '2026-09-02T10:00:00Z'),
    ]);
    assert.equal(gaps.length, 2);
  });

  it('returns nothing for no input', () => {
    assert.deepEqual(groupGaps([]), []);
  });
});
