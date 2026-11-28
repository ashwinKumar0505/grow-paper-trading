import { getFeatureLandingContent } from '../../features/feature-landing/data/featureContentMap';
import {
  getPatternCatalogEntries,
  getPublicPatternEntries,
} from '../../features/quiz/utils/patternCatalog';
import { LEGAL_LAST_UPDATED_DISPLAY, SUPPORT_EMAIL } from '../../lib/seo/constants';
import type { LegalRouteKey, RouteSeoMetadata } from '../../lib/seo/routeMetadata';
import { SUBSCRIPTION_PLANS } from '../../lib/subscription';
import { renderFeatureLandingBody } from './featureCrawlerMarkup';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderShellNav(): string {
  return [
    '<header>',
    '<nav aria-label="Primary">',
    '<a href="/">Tradedia</a> · ',
    '<a href="/paper-trading-india">Paper Trading</a> · ',
    '<a href="/ai-stock-screener">AI Stock Screener</a> · ',
    '<a href="/guess-the-chart">Guess the Chart</a> · ',
    '<a href="/learn">Learn Chart Patterns</a> · ',
    '<a href="/pricing">Pricing &amp; Plans</a>',
    '</nav>',
    '</header>',
  ].join('');
}

function renderShellFooter(): string {
  return [
    '<footer>',
    '<p>Tradedia is an educational paper trading, AI-powered stock screening, and chart pattern learning platform. Not registered with SEBI as a broker or investment adviser. All trading balances are simulated virtual capital.</p>',
    '<nav aria-label="Legal">',
    '<a href="/terms">Terms of Service</a> · ',
    '<a href="/privacy">Privacy Policy</a> · ',
    '<a href="/refund-policy">Refund Policy</a> · ',
    '<a href="/disclaimer">SEBI Disclaimer</a> · ',
    '<a href="/contact">Contact</a>',
    '</nav>',
    '</footer>',
  ].join('');
}

function renderHomeBody(): string {
  const publicPatterns = getPublicPatternEntries()
    .map((p) => `<li><a href="/learn/${escapeHtml(p.slug)}">${escapeHtml(p.shortTitle)}</a> — ${escapeHtml(p.template.simpleName)}</li>`)
    .join('');

  return [
    '<main>',
    '<h1>Real-Time Paper Trading in India, AI-Powered Stock Screener &amp; Chart Pattern Learning</h1>',
    '<p>Tradedia is one place to learn trading in India. Practice Delivery (CNC) and 5x Intraday (MIS) virtual trading with simulated capital, scan Nifty 500 stocks with backtested strategies and AI-powered technical insights, and master 21 candlestick and chart patterns.</p>',
    '<section><h2>1. Risk-Free NSE Paper Trading</h2><p>Practice trading Indian stocks with ₹1,00,000 to ₹50,00,000 in virtual capital, realistic statutory charges, Market, Limit, SL, SL-M, and After-Market Orders (AMO). <a href="/paper-trading-india">Learn more about Paper Trading in India</a>.</p></section>',
    '<section><h2>2. AI-Powered Nifty 500 Stock Screener</h2><p>Discover swing and 15-minute intraday setups using backtested strategies, multi-indicator chart analysis, 2-year historical strategy backtests, and rule-based technical commentary. <a href="/ai-stock-screener">Learn more about AI-Powered Stock Screener</a>.</p></section>',
    `<section><h2>3. Learn Chart Patterns &amp; Guess the Chart</h2><p>Study 21 reversal, continuation, bilateral, and candlestick patterns with entry, stop-loss, and target rules, or test your skills in <a href="/guess-the-chart">Guess the Chart</a>.</p><ul>${publicPatterns}</ul><p><a href="/learn">Explore the Chart Pattern Library</a></p></section>`,
    '<section><h2>Simple, Transparent Plans</h2><p>Start free with ₹1,00,000 virtual capital or upgrade to Beginner (₹299/month) or Advanced (₹699/month). <a href="/pricing">Compare all Tradedia plans</a>.</p></section>',
    '</main>',
  ].join('');
}

function renderLearnHubBody(): string {
  const freeItems = getPublicPatternEntries()
    .map(
      (entry) =>
        `<li><h3><a href="/learn/${escapeHtml(entry.slug)}">${escapeHtml(entry.template.name)}</a></h3><p>${escapeHtml(entry.template.explanation)}</p></li>`
    )
    .join('');
  const totalCount = getPatternCatalogEntries().length;

  return [
    '<main>',
    '<h1>Learn Chart Patterns – Interactive Candlestick &amp; Price Action Library</h1>',
    `<p>Master ${totalCount} classic reversal, continuation, bilateral, and candlestick patterns on Tradedia with plain-English explanations, why each setup works, and exact entry, stop-loss, and profit target rules.</p>`,
    `<section><h2>Free Beginner Chart Pattern Guides</h2><ul>${freeItems}</ul></section>`,
    '</main>',
  ].join('');
}

function renderPatternBody(seo: RouteSeoMetadata): string {
  const entry = seo.patternEntry;
  if (!entry) return renderLearnHubBody();
  const { template, shortTitle, isPublicFree } = entry;
  const related = getPublicPatternEntries()
    .filter((item) => item.slug !== entry.slug)
    .map((item) => `<li><a href="/learn/${escapeHtml(item.slug)}">${escapeHtml(item.shortTitle)}</a></li>`)
    .join('');

  if (!isPublicFree) {
    return [
      '<main>',
      `<h1>${escapeHtml(shortTitle)} Chart Pattern</h1>`,
      `<p>${escapeHtml(shortTitle)} is part of the full 21-pattern library available on Tradedia Beginner and Advanced plans. <a href="/learn">Browse free beginner chart patterns</a> or <a href="/pricing">view plans</a>.</p>`,
      '</main>',
    ].join('');
  }

  return [
    '<main>',
    `<article>`,
    `<p><a href="/learn">Learn Chart Patterns</a> / ${escapeHtml(shortTitle)}</p>`,
    `<h1>${escapeHtml(template.name)}</h1>`,
    `<p>${escapeHtml(template.simpleName)} · ${escapeHtml(template.category)} · ${escapeHtml(template.difficulty)} Level</p>`,
    `<section><h2>Pattern Description</h2><p>${escapeHtml(template.explanation)}</p><p><strong>Pro Tip:</strong> ${escapeHtml(template.proTip)}</p></section>`,
    `<section><h2>Why This Chart Pattern Works</h2><p>${escapeHtml(template.keyObservation)}</p></section>`,
    `<section><h2>Trade Plan Rules</h2><ul><li><strong>Entry Trigger:</strong> ${escapeHtml(template.entryRule)}</li><li><strong>Stop-Loss / Invalidation:</strong> ${escapeHtml(template.stopLossRule)}</li><li><strong>Profit Target:</strong> ${escapeHtml(template.targetRule)}</li></ul></section>`,
    `</article>`,
    `<aside><h2>More Free Chart Pattern Guides</h2><ul>${related}</ul></aside>`,
    '</main>',
  ].join('');
}

function renderPricingBody(): string {
  const plans = [SUBSCRIPTION_PLANS.free, SUBSCRIPTION_PLANS.beginner, SUBSCRIPTION_PLANS.advanced]
    .map((plan) => {
      const price = plan.monthlyPrice === 0 ? '₹0 Free Forever' : `₹${plan.monthlyPrice}/month or ₹${plan.yearlyPrice}/year`;
      const items = plan.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('');
      return `<section><h2>${escapeHtml(plan.name)} — ${escapeHtml(price)}</h2><p>${escapeHtml(plan.tagline)}</p><ul>${items}</ul></section>`;
    })
    .join('');

  return [
    '<main>',
    '<h1>Tradedia Pricing &amp; Membership Plans</h1>',
    '<p>Compare Free Starter, Beginner, and Advanced plans for paper trading in India, AI-powered Nifty 500 stock screening, and interactive chart pattern learning.</p>',
    plans,
    '</main>',
  ].join('');
}

const LEGAL_BODY_SUMMARY: Record<LegalRouteKey, string> = {
  terms:
    'Tradedia provides an educational paper trading simulator, AI-powered technical stock screeners, and interactive chart pattern lessons. All virtual portfolios (₹1,00,000 to ₹50,00,000) are 100% simulated. Tradedia is not SEBI-registered and does not provide investment advice. Governed by the laws of India.',
  privacy: `Tradedia collects account details via Firebase Authentication, virtual simulation state, and Razorpay payment metadata without storing card numbers or UPI PINs. Production Google Analytics 4 and optional Google Ads signup conversion measurement (including one-way SHA-256 hashed verified email Enhanced Conversions) use Google Consent Mode v2 (denied by default, independent toggles, permanently disabled ad personalization, and no plain-text personal data transmitted). Contact ${SUPPORT_EMAIL} for data deletion requests.`,
  'refund-policy': `Cancel recurring monthly or yearly Tradedia subscriptions anytime. First-time subscribers are eligible for a 7-day satisfaction refund, and duplicate charges are refunded 100% via Razorpay within 5–7 business days. Email ${SUPPORT_EMAIL} with your Razorpay Payment ID.`,
  disclaimer:
    'Important Statutory Notice: Tradedia is an educational simulation and technical charting tool and is NOT a SEBI-registered Research Analyst, Investment Adviser, or Stock Broker. Historical backtests do not guarantee future returns. Consult a SEBI-registered adviser before deploying real capital.',
  contact: `Customer Support, Billing & Compliance Officer — Tradedia Educational Technologies (India), Bengaluru, Karnataka, India. Email: ${SUPPORT_EMAIL}. Response time: Within 24 business hours (Mon–Sat, 9:30 AM – 6:30 PM IST).`,
};

function renderLegalBody(seo: RouteSeoMetadata): string {
  const kind = seo.legalKind || 'terms';
  return [
    '<main>',
    `<h1>${escapeHtml(seo.title.replace(/\s*\|\s*Tradedia$/, ''))}</h1>`,
    `<p>Last updated: ${escapeHtml(LEGAL_LAST_UPDATED_DISPLAY)}</p>`,
    `<p>${escapeHtml(LEGAL_BODY_SUMMARY[kind])}</p>`,
    '</main>',
  ].join('');
}

export function buildCrawlerRootMarkup(seo: RouteSeoMetadata): string {
  if (seo.kind === 'auth-gated') return '';
  if (seo.kind === 'not-found') {
    return `<div class="mx-auto max-w-4xl px-4 py-12 text-center"><h1>Page not found</h1><p>The page you requested could not be found on Tradedia.</p><p><a href="/">Return to Tradedia</a></p></div>`;
  }

  let body = '';
  if (seo.kind === 'home') body = renderHomeBody();
  else if (seo.kind === 'feature-landing' && seo.featureRoute) {
    const content = getFeatureLandingContent(seo.featureRoute);
    if (content) body = renderFeatureLandingBody(content, escapeHtml);
  } else if (seo.kind === 'learn-hub') body = renderLearnHubBody();
  else if (seo.kind === 'learn-pattern') body = renderPatternBody(seo);
  else if (seo.kind === 'pricing') body = renderPricingBody();
  else if (seo.kind === 'legal') body = renderLegalBody(seo);

  if (!body) return '';
  return `<div class="mx-auto max-w-5xl px-4 py-8 space-y-6">${renderShellNav()}${body}${renderShellFooter()}</div>`;
}
