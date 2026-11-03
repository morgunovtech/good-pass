import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { handleAnalyze, handleBreachCheck } from './api.js';
import { log } from './log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = (() => {
  const raw = process.env.PORT;
  if (raw === undefined) return 3000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Invalid PORT: "${raw}"`);
  }
  return parsed;
})();

app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '5kb' }));

// Rate limit for API.
const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте через минуту.' }
});

// Security headers.
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'interest-cohort=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; font-src https://s.morgunov.tech; style-src 'self' https://s.morgunov.tech; img-src 'self' data: blob:; script-src 'self'; connect-src 'self'; worker-src 'self'"
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Static files with caching.
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    setHeaders(res) {
      if (res.req.path.endsWith('.html') || res.req.path === '/') {
        res.setHeader('Cache-Control', 'no-store');
      }
    }
  })
);

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

// --- API: the same handlers serve the Pages Functions in production ---
app.post('/api/v1/analyze', apiLimiter, (req, res) => {
  const { status, body } = handleAnalyze(req.body);
  res.status(status).json(body);
});

app.post('/api/v1/breach-check', apiLimiter, async (req, res) => {
  const { status, body } = await handleBreachCheck(req.body);
  res.status(status).json(body);
});

// Legacy route redirect.
app.post('/api/analyze', apiLimiter, (req, res) => {
  res.redirect(307, '/api/v1/analyze');
});

app.use((err, req, res, _next) => {
  log('error', 'unhandled_error', { message: err?.message ?? 'unknown' });
  res.status(500).json({ error: 'Что-то пошло не так. Попробуйте снова позже.' });
});

export { app };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    log('info', 'server_started', { port });
  });
}
