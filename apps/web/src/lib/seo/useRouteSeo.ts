import { useEffect } from 'react';
import {
  BRAND_NAME,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_TYPE,
  DEFAULT_OG_IMAGE_WIDTH,
  TWITTER_CARD_TYPE,
} from './constants';
import { resolveRouteSeo } from './routeMetadata';

const JSON_LD_SCRIPT_ID = 'tradedia-seo-jsonld';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string): void {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function upsertCanonical(href: string | null): void {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.setAttribute('href', href);
    return;
  }
  const link = document.createElement('link');
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', href);
  document.head.appendChild(link);
}

function upsertJsonLd(data: unknown): void {
  const existing = document.getElementById(JSON_LD_SCRIPT_ID);
  if (!data) {
    existing?.remove();
    return;
  }
  const serialized = JSON.stringify(data);
  if (existing) {
    existing.textContent = serialized;
    return;
  }
  const script = document.createElement('script');
  script.id = JSON_LD_SCRIPT_ID;
  script.type = 'application/ld+json';
  script.textContent = serialized;
  document.head.appendChild(script);
}

export function useRouteSeo(pathname: string): void {
  useEffect(() => {
    const seo = resolveRouteSeo(pathname);
    document.title = seo.title;

    upsertMeta('name', 'description', seo.description);
    upsertMeta('name', 'keywords', seo.keywords);
    upsertMeta('name', 'robots', seo.robots);
    upsertCanonical(seo.canonicalUrl);

    upsertMeta('property', 'og:type', seo.ogType);
    upsertMeta('property', 'og:site_name', BRAND_NAME);
    upsertMeta('property', 'og:title', seo.title);
    upsertMeta('property', 'og:description', seo.description);
    upsertMeta('property', 'og:image', seo.ogImage);
    upsertMeta('property', 'og:image:alt', seo.ogImageAlt);
    upsertMeta('property', 'og:image:width', String(DEFAULT_OG_IMAGE_WIDTH));
    upsertMeta('property', 'og:image:height', String(DEFAULT_OG_IMAGE_HEIGHT));
    upsertMeta('property', 'og:image:type', DEFAULT_OG_IMAGE_TYPE);
    upsertMeta('property', 'og:locale', 'en_IN');

    if (seo.canonicalUrl) {
      upsertMeta('property', 'og:url', seo.canonicalUrl);
    } else {
      removeMeta('property', 'og:url');
    }

    upsertMeta('name', 'twitter:card', TWITTER_CARD_TYPE);
    upsertMeta('name', 'twitter:title', seo.title);
    upsertMeta('name', 'twitter:description', seo.description);
    upsertMeta('name', 'twitter:image', seo.ogImage);
    upsertMeta('name', 'twitter:image:alt', seo.ogImageAlt);

    upsertJsonLd(seo.structuredData);
  }, [pathname]);
}
