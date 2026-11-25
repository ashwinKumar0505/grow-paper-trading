import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import { createExpressApp, runServerBackgroundTradingTick } from './src/server/app';
import { marketDataRegistry } from './src/server/providers/providerRegistry';
import { defaultStore } from './src/server/storage/durableStore';

dotenv.config();
marketDataRegistry.refreshPolicies(process.env);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';
const app = createExpressApp(defaultStore);

// Authoritative background order queue & intraday RMS square-off processor
const bgTimer = setInterval(() => {
  runServerBackgroundTradingTick(defaultStore, Date.now()).catch(() => {});
}, 15000);
bgTimer.unref?.();

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(
      '/assets',
      express.static(path.join(distPath, 'assets'), { maxAge: '1y', immutable: true })
    );
    app.use(express.static(distPath, { maxAge: '1h' }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Tradedia server running on ${HOST}:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down Tradedia server gracefully...`);
    clearInterval(bgTimer);
    defaultStore.persist();
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
