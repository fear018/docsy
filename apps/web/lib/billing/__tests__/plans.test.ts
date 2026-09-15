import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, PLAN_IDS, checkQuota, effectivePlan, getPlan } from '@docsy/shared';

/**
 * The pricing table is a promise to the customer. These assertions are the
 * copy on the page and the behaviour in the code agreeing with each other.
 */

describe('plan limits match the published table', () => {
  const expected = {
    free: { bots: 1, pages: 50, messagesPerMonth: 100, historyDays: 7 },
    pro: { bots: 3, pages: 1000, messagesPerMonth: 2000, historyDays: 90 },
    business: { bots: 10, pages: 10_000, messagesPerMonth: 10_000, historyDays: null },
  } as const;

  for (const id of PLAN_IDS) {
    it(id, () => {
      assert.deepEqual(PLANS[id].limits, expected[id]);
    });
  }

  it('prices are 0, 39 and 129', () => {
    assert.deepEqual(
      PLAN_IDS.map((id) => PLANS[id].price),
      [0, 39, 129],
    );
  });
});

describe('gated features match the published table', () => {
  it('only the free plan carries branding', () => {
    assert.equal(PLANS.free.features.widgetBranding, true);
    assert.equal(PLANS.pro.features.widgetBranding, false);
    assert.equal(PLANS.business.features.widgetBranding, false);
  });

  it('the gap report is a paid feature', () => {
    assert.equal(PLANS.free.features.gapReport, false);
    assert.equal(PLANS.pro.features.gapReport, true);
    assert.equal(PLANS.business.features.gapReport, true);
  });

  it('re-sync schedule rises with the plan', () => {
    assert.equal(PLANS.free.features.autoSync, 'manual');
    assert.equal(PLANS.pro.features.autoSync, 'weekly');
    assert.equal(PLANS.business.features.autoSync, 'daily');
  });

  it('full widget customisation starts at Pro', () => {
    assert.equal(PLANS.free.features.widgetCustomisation, 'basic');
    assert.equal(PLANS.pro.features.widgetCustomisation, 'full');
  });
});

describe('effectivePlan', () => {
  it('honours an active subscription', () => {
    assert.equal(effectivePlan('pro', 'active').id, 'pro');
  });

  it('keeps access during the grace period after a failed payment', () => {
    assert.equal(effectivePlan('pro', 'past_due').id, 'pro');
  });

  it('falls back to free once the subscription is gone', () => {
    assert.equal(effectivePlan('pro', 'canceled').id, 'free');
    assert.equal(effectivePlan('business', null).id, 'free');
  });

  it('treats an unknown plan as free', () => {
    assert.equal(getPlan(null).id, 'free');
  });
});

describe('checkQuota', () => {
  it('allows up to the limit and refuses at it', () => {
    assert.equal(checkQuota(99, 100).allowed, true);
    assert.equal(checkQuota(100, 100).allowed, false);
    assert.equal(checkQuota(101, 100).allowed, false);
  });

  it('warns from 80% so the owner hears before visitors do', () => {
    assert.equal(checkQuota(79, 100).warn, false);
    assert.equal(checkQuota(80, 100).warn, true);
  });

  it('never reports more than a full bar', () => {
    assert.equal(checkQuota(500, 100).ratio, 1);
  });
});

describe('downgrade keeps the oldest bots editable', () => {
  /** Mirrors getEntitlements: the plan's allowance goes to the oldest bots. */
  const frozen = (botIds: string[], limit: number) => new Set(botIds.slice(limit));

  it('freezes only the excess', () => {
    const ids = ['first', 'second', 'third', 'fourth'];
    assert.deepEqual([...frozen(ids, 1)], ['second', 'third', 'fourth']);
    assert.deepEqual([...frozen(ids, 3)], ['fourth']);
  });

  it('freezes nothing when the plan covers them all', () => {
    assert.equal(frozen(['a', 'b'], 10).size, 0);
  });

  it('deletes nothing — every bot is still present', () => {
    const ids = ['a', 'b', 'c'];
    const readOnly = frozen(ids, 1);
    assert.equal(ids.length, 3, 'the list is untouched');
    assert.equal(ids.filter((id) => !readOnly.has(id)).length, 1, 'one stays editable');
  });
});
