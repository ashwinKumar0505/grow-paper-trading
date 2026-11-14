import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUBSCRIPTION_PLANS } from '../lib/subscription';
import {
  formatINR,
  formatLakh,
  getMaxYearlySavingsPercent,
  getPlanCtaState,
  getPlanPriceView,
  getUpgradeAmountQuote,
} from './pricing';

test('monthly prices come straight from plan configuration', () => {
  assert.equal(getPlanPriceView(SUBSCRIPTION_PLANS.beginner, 'monthly').charged, 299);
  assert.equal(getPlanPriceView(SUBSCRIPTION_PLANS.advanced, 'monthly').charged, 699);
  assert.equal(getPlanPriceView(SUBSCRIPTION_PLANS.beginner, 'monthly').periodLabel, '/ month');
});

test('yearly view shows annual charge, monthly equivalent and genuine savings', () => {
  const beginner = getPlanPriceView(SUBSCRIPTION_PLANS.beginner, 'yearly');
  assert.equal(beginner.charged, 2899);
  assert.equal(beginner.periodLabel, '/ year');
  assert.equal(beginner.monthlyEquivalent, 242);
  assert.equal(beginner.yearlySavings, 299 * 12 - 2899); // ₹689
  assert.equal(beginner.yearlySavingsPercent, 19); // 19.2% floored, never overstated

  const advanced = getPlanPriceView(SUBSCRIPTION_PLANS.advanced, 'yearly');
  assert.equal(advanced.charged, 6699);
  assert.equal(advanced.monthlyEquivalent, 558);
  assert.equal(advanced.yearlySavings, 699 * 12 - 6699); // ₹1,689
  assert.equal(advanced.yearlySavingsPercent, 20);
});

test('free plan has no savings and is free forever', () => {
  const free = getPlanPriceView(SUBSCRIPTION_PLANS.free, 'yearly');
  assert.equal(free.charged, 0);
  assert.equal(free.periodLabel, 'forever');
  assert.equal(free.yearlySavingsPercent, 0);
  assert.equal(getMaxYearlySavingsPercent(Object.values(SUBSCRIPTION_PLANS)), 20);
});

test('rupee formatting uses Indian grouping', () => {
  assert.equal(formatINR(1000000), '₹10,00,000');
  assert.equal(formatLakh(5000000), '₹50L');
  assert.equal(formatLakh(100000), '₹1L');
});

test('CTA state prevents duplicate purchases and allows renewals only after expiry', () => {
  const now = 1_800_000_000_000;
  assert.equal(getPlanCtaState({ cardTier: 'beginner', isLoggedIn: false, userTier: 'free' }), 'signup');
  assert.equal(getPlanCtaState({ cardTier: 'beginner', isLoggedIn: true, userTier: 'free' }), 'upgrade');
  assert.equal(getPlanCtaState({ cardTier: 'beginner', isLoggedIn: true, userTier: 'beginner', expiresAt: now + 1, now }), 'active');
  assert.equal(getPlanCtaState({ cardTier: 'beginner', isLoggedIn: true, userTier: 'beginner', expiresAt: now - 1, now }), 'renew');
  assert.equal(getPlanCtaState({ cardTier: 'beginner', isLoggedIn: true, userTier: 'advanced' }), 'included');
  assert.equal(getPlanCtaState({ cardTier: 'advanced', isLoggedIn: true, userTier: 'beginner' }), 'upgrade');
  assert.equal(getPlanCtaState({ cardTier: 'free', isLoggedIn: true, userTier: 'free' }), 'active');
  assert.equal(getPlanCtaState({ cardTier: 'free', isLoggedIn: true, userTier: 'advanced' }), 'open-desk');
});

test('differential upgrade pricing charges Beginner users only (Advanced - Beginner)', () => {
  // Free -> Beginner or Advanced pays full price
  const freeToBeginner = getUpgradeAmountQuote({
    targetTier: 'beginner',
    billingCycle: 'monthly',
    currentTier: 'free',
    plans: SUBSCRIPTION_PLANS,
  });
  assert.equal(freeToBeginner.payableINR, 299);
  assert.equal(freeToBeginner.creditAppliedINR, 0);
  assert.equal(freeToBeginner.isDifferentialUpgrade, false);

  // Beginner -> Advanced monthly pays ₹699 - ₹299 = ₹400
  const begToAdvMonthly = getUpgradeAmountQuote({
    targetTier: 'advanced',
    billingCycle: 'monthly',
    currentTier: 'beginner',
    plans: SUBSCRIPTION_PLANS,
  });
  assert.equal(begToAdvMonthly.fullPriceINR, 699);
  assert.equal(begToAdvMonthly.creditAppliedINR, 299);
  assert.equal(begToAdvMonthly.payableINR, 400);
  assert.equal(begToAdvMonthly.isDifferentialUpgrade, true);

  // Beginner -> Advanced yearly pays ₹6,699 - ₹2,899 = ₹3,800
  const begToAdvYearly = getUpgradeAmountQuote({
    targetTier: 'advanced',
    billingCycle: 'yearly',
    currentTier: 'beginner',
    plans: SUBSCRIPTION_PLANS,
  });
  assert.equal(begToAdvYearly.fullPriceINR, 6699);
  assert.equal(begToAdvYearly.creditAppliedINR, 2899);
  assert.equal(begToAdvYearly.payableINR, 3800);
  assert.equal(begToAdvYearly.isDifferentialUpgrade, true);
});
