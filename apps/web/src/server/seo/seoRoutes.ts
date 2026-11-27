import fs from 'fs';
import path from 'path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import { canonicalPath } from '../../lib/navigation';
import { APEX_HOST, CANONICAL_ORIGIN } from '../../lib/seo/constants';
import { resolveRouteSeo } from '../../lib/seo/routeMetadata';
import { renderSeoHtml } from './htmlRenderer';
import {
  getSitemapEntries,
  isPreviewHost,
  renderRobotsTxt,
  renderSitemapXml,
  type SitemapEntry,
} from './sitemapAndRobots';

const STATIC_ASSET_EXT_RE =
  /\.(?:js|mjs|cjs|css|map|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|eot|json|xml|txt|pdf|webmanifest)$/i;

export function createSeoInfraRouter(options?: {
  getDynamicSitemapEntries?: () => Promise<SitemapEntry[]> | SitemapEntry[];
}): Router {
  const router = Router();

  router.get('/sitemap.xml', async (_req, res) => {
    try {
      const dynamicEntries = options?.getDynamicSitemapEntries
        ? await options.getDynamicSitemapEntries()
        : undefined;
      const xml = renderSitemapXml(getSitemapEntries({ dynamicEntries }));
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.status(200).send(xml);
    } catch {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(500).send('Unable to generate sitemap.');
    }
  });

  router.get('/robots.txt', (req, res) => {
    const body = renderRobotsTxt({ host: req.get('host') });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(body);
  });

  router.get('/favicon.ico', (_req, res) => {
    res.redirect(301, '/images/landing/logo-48.png');
  });

  return router;
}

export function createProductionPageMiddleware(
  distPath: string,
  options?: { templateHtml?: string; env?: Record<string, string | undefined> }
) {
  let cachedTemplate: string | null = options?.templateHtml ?? null;
  const env = options?.env || process.env;

  const loadTemplate = (): string => {
    if (cachedTemplate !== null) return cachedTemplate;
    cachedTemplate = fs.readFileSync(path.resolve(distPath, 'index.html'), 'utf-8');
    return cachedTemplate;
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    if (req.path === '/api' || req.path.startsWith('/api/')) {
      next();
      return;
    }

    const host = (req.get('host') || '').split(':')[0].trim().toLowerCase();
    if (env.NODE_ENV === 'production' && host === APEX_HOST) {
      res.redirect(301, `${CANONICAL_ORIGIN}${req.originalUrl}`);
      return;
    }

    if (STATIC_ASSET_EXT_RE.test(req.path)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.status(404).send('Not found');
      return;
    }

    const normalizedPath = canonicalPath(req.path);
    if (normalizedPath !== req.path) {
      const qIndex = req.originalUrl.indexOf('?');
      const query = qIndex >= 0 ? req.originalUrl.slice(qIndex) : '';
      res.redirect(301, `${normalizedPath}${query}`);
      return;
    }

    const seo = resolveRouteSeo(normalizedPath);
    if (isPreviewHost(req.get('host'))) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    } else if (!seo.indexable) {
      res.setHeader('X-Robots-Tag', seo.robots);
    }

    const html = renderSeoHtml(loadTemplate(), seo);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(seo.statusCode).send(html);
  };
}
