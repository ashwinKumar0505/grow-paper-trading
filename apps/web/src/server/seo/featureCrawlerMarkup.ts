import type { FeatureLandingContent } from '../../features/feature-landing/types';

export function renderFeatureLandingBody(
  content: FeatureLandingContent,
  escapeHtml: (value: string) => string
): string {
  const bullets = content.heroBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('');
  const whatIs = content.whatIsParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  const features = content.features
    .map(
      (f) =>
        `<li><h3>${escapeHtml(f.title)}</h3><p>${escapeHtml(f.description)}</p></li>`
    )
    .join('');
  const steps = content.steps
    .map(
      (s) =>
        `<li><h3>${escapeHtml(s.step)}. ${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description)}</p></li>`
    )
    .join('');
  const audience = content.audience
    .map(
      (a) =>
        `<li><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.description)}</p></li>`
    )
    .join('');
  const faqs = content.faqs
    .map(
      (f) =>
        `<details><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`
    )
    .join('');
  const related = content.relatedLinks
    .map(
      (r) =>
        `<li><a href="${escapeHtml(r.href)}">${escapeHtml(r.title)}</a> — ${escapeHtml(r.description)}</li>`
    )
    .join('');

  return [
    '<main>',
    `<section><p>${escapeHtml(content.eyebrow)}</p><h1>${escapeHtml(content.heroTitleStart)} ${escapeHtml(content.heroTitleAccent)}</h1><p>${escapeHtml(content.heroDescription)}</p><ul>${bullets}</ul><p><a href="${escapeHtml(content.primaryCta.href)}">${escapeHtml(content.primaryCta.label)}</a> · <a href="${escapeHtml(content.secondaryCta.href)}">${escapeHtml(content.secondaryCta.label)}</a></p></section>`,
    `<section><h2>${escapeHtml(content.whatIsTitle)}</h2>${whatIs}</section>`,
    `<section><h2>${escapeHtml(content.featuresTitle)}</h2><p>${escapeHtml(content.featuresSubtitle)}</p><ul>${features}</ul></section>`,
    `<section><h2>${escapeHtml(content.stepsTitle)}</h2><p>${escapeHtml(content.stepsSubtitle)}</p><ol>${steps}</ol></section>`,
    `<section><h2>${escapeHtml(content.audienceTitle)}</h2><p>${escapeHtml(content.audienceSubtitle)}</p><ul>${audience}</ul></section>`,
    `<section><h2>${escapeHtml(content.faqsTitle)}</h2>${faqs}</section>`,
    `<section><h2>Explore More Tradedia Learning Tools</h2><ul>${related}</ul></section>`,
    `<section><h2>${escapeHtml(content.finalCta.title)}</h2><p>${escapeHtml(content.finalCta.description)}</p><p><a href="${escapeHtml(content.primaryCta.href)}">${escapeHtml(content.primaryCta.label)}</a></p><p>${escapeHtml(content.finalCta.disclaimer)}</p></section>`,
    '</main>',
  ].join('');
}
