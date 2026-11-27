import assert from 'node:assert/strict';
import fs from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import path from 'node:path';
import test from 'node:test';
import type { Express } from 'express';
import { createExpressApp } from '../server/app';
import { createProductionPageMiddleware } from '../server/seo/seoRoutes';
import { DurableStore } from '../server/storage/durableStore';

function invokeExpress(
  app: Express,
  urlPath: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: Record<string, string>; body: string }> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const chunks: Buffer[] = [];
    const req = new IncomingMessage(socket);
    req.url = urlPath;
    req.method = 'GET';
    req.headers = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    );

    const res = new ServerResponse(req);
    res.assignSocket(socket);
    const origWrite = res.write.bind(res);
    const origEnd = res.end.bind(res);

    res.write = ((chunk: unknown, ...rest: unknown[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return true;
    }) as typeof origWrite;

    res.end = ((chunk?: unknown) => {
      if (chunk && typeof chunk !== 'function') {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      const rawHeaders = res.getHeaders();
      const outHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawHeaders)) {
        if (v !== undefined) outHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
      }
      res.emit('finish');
      resolve({ status: res.statusCode, headers: outHeaders, body: Buffer.concat(chunks).toString('utf8') });
      return res;
    }) as typeof origEnd;

    const handler = app as unknown as (
      request: IncomingMessage,
      response: ServerResponse,
      next: (err?: unknown) => void
    ) => void;
    handler(req, res, (err?: unknown) => {
      if (err) reject(err);
    });
  });
}

test('Express serves sitemap.xml, robots.txt, per-route SEO HTML, canonical redirects, and 404s', async () => {
  const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
  const app = createExpressApp(new DurableStore({ inMemoryOnly: true }));
  app.use(
    createProductionPageMiddleware(process.cwd(), {
      templateHtml: indexHtml,
      env: { NODE_ENV: 'production' },
    })
  );

  // 1. sitemap.xml
  const sitemap = await invokeExpress(app, '/sitemap.xml', { Host: 'www.tradedia.in' });
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers['content-type'] || '', /application\/xml/i);
  assert.ok(sitemap.body.includes('<loc>https://www.tradedia.in/</loc>'));
  assert.ok(sitemap.body.includes('<loc>https://www.tradedia.in/paper-trading-india</loc>'));
  assert.ok(sitemap.body.includes('<loc>https://www.tradedia.in/ai-stock-screener</loc>'));
  assert.ok(sitemap.body.includes('<loc>https://www.tradedia.in/guess-the-chart</loc>'));
  assert.ok(sitemap.body.includes('<loc>https://www.tradedia.in/learn/double-top</loc>'));
  assert.ok(!sitemap.body.includes('<!doctype html>'));

  // 2. robots.txt (production & Railway preview host)
  const robots = await invokeExpress(app, '/robots.txt', { Host: 'www.tradedia.in' });
  assert.equal(robots.status, 200);
  assert.match(robots.headers['content-type'] || '', /text\/plain/i);
  assert.ok(robots.body.includes('Sitemap: https://www.tradedia.in/sitemap.xml'));

  const previewRobots = await invokeExpress(app, '/robots.txt', {
    Host: 'tradedia-web-production.up.railway.app',
  });
  assert.equal(previewRobots.status, 200);
  assert.equal(previewRobots.body.trim(), 'User-agent: *\nDisallow: /');

  // 3. Homepage & individual chart pattern SSR metadata + crawler HTML
  const home = await invokeExpress(app, '/', { Host: 'www.tradedia.in' });
  assert.equal(home.status, 200);
  assert.equal(home.headers['x-robots-tag'], undefined);
  assert.ok(home.body.includes('<link rel="canonical" href="https://www.tradedia.in/" />'));
  assert.ok(home.body.includes('content="https://www.tradedia.in/images/landing/tradedia-social-share-card.png"'));
  assert.ok(home.body.includes('<meta property="og:image:width" content="1200" />'));
  assert.ok(home.body.includes('<meta property="og:image:height" content="630" />'));
  assert.ok(home.body.includes('<meta name="twitter:card" content="summary_large_image" />'));
  assert.ok(home.body.includes('"@type":"WebApplication"'));
  assert.ok(home.body.includes('<h1>Real-Time Paper Trading in India'));

  const pattern = await invokeExpress(app, '/learn/double-top', { Host: 'www.tradedia.in' });
  assert.equal(pattern.status, 200);
  assert.ok(pattern.body.includes('<link rel="canonical" href="https://www.tradedia.in/learn/double-top" />'));
  assert.ok(pattern.body.includes('Double Top Chart Pattern'));
  assert.ok(pattern.body.includes('"@type":"BreadcrumbList"'));
  assert.ok(pattern.body.includes('"@type":"LearningResource"'));
  assert.ok(pattern.body.includes('Entry Trigger:'));

  // 3b. Dedicated public feature landing pages
  for (const [route, heading, ctaHref] of [
    ['/paper-trading-india', 'Paper Trading in India.', 'href="/trade"'],
    ['/ai-stock-screener', 'AI-Powered Stock Screener', 'href="/screener"'],
    ['/guess-the-chart', 'Guess the Chart.', 'href="/quiz"'],
  ]) {
    const res = await invokeExpress(app, route, { Host: 'www.tradedia.in' });
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-robots-tag'], undefined);
    assert.ok(res.body.includes(`<link rel="canonical" href="https://www.tradedia.in${route}" />`));
    assert.ok(res.body.includes('"@type":"FAQPage"'));
    assert.ok(res.body.includes(heading));
    assert.ok(res.body.includes(ctaHref));
  }

  // 4. Canonical redirects (apex -> www, alias -> canonical, trailing slash)
  const apex = await invokeExpress(app, '/pricing', { Host: 'tradedia.in' });
  assert.equal(apex.status, 301);
  assert.equal(apex.headers.location, 'https://www.tradedia.in/pricing');

  const alias = await invokeExpress(app, '/pattern-library', { Host: 'www.tradedia.in' });
  assert.equal(alias.status, 301);
  assert.equal(alias.headers.location, '/learn');

  const trailing = await invokeExpress(app, '/pricing/?utm_source=test', { Host: 'www.tradedia.in' });
  assert.equal(trailing.status, 301);
  assert.equal(trailing.headers.location, '/pricing?utm_source=test');

  // 5. Auth-gated, preview host, 404, missing asset & API noindex headers
  const profile = await invokeExpress(app, '/profile', { Host: 'www.tradedia.in' });
  assert.equal(profile.status, 200);
  assert.equal(profile.headers['x-robots-tag'], 'noindex, nofollow');
  assert.ok(profile.body.includes('<meta name="robots" content="noindex, nofollow" />'));

  const previewHome = await invokeExpress(app, '/', {
    Host: 'tradedia-web-production.up.railway.app',
  });
  assert.equal(previewHome.status, 200);
  assert.equal(previewHome.headers['x-robots-tag'], 'noindex, nofollow');

  const notFound = await invokeExpress(app, '/does-not-exist', { Host: 'www.tradedia.in' });
  assert.equal(notFound.status, 404);
  assert.equal(notFound.headers['x-robots-tag'], 'noindex, nofollow');
  assert.ok(!notFound.body.includes('rel="canonical"'));

  const badPattern = await invokeExpress(app, '/learn/not-a-real-pattern', { Host: 'www.tradedia.in' });
  assert.equal(badPattern.status, 404);

  const missingImg = await invokeExpress(app, '/images/missing.png', { Host: 'www.tradedia.in' });
  assert.equal(missingImg.status, 404);

  const health = await invokeExpress(app, '/api/health', { Host: 'www.tradedia.in' });
  assert.equal(health.status, 200);
  assert.equal(health.headers['x-robots-tag'], 'noindex, nofollow');

  const badApi = await invokeExpress(app, '/api/unknown-endpoint', { Host: 'www.tradedia.in' });
  assert.equal(badApi.status, 404);
  assert.equal(badApi.headers['x-robots-tag'], 'noindex, nofollow');
  assert.match(badApi.headers['content-type'] || '', /application\/json/i);
});
