import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { analyzePassword } from './passwordAnalyzer.js';

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
const serviceName = 'good-pass-service';
const serviceVersion = '2024.10.07';

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
    "default-src 'self'; font-src https://fonts.gstatic.com; style-src 'self' https://fonts.googleapis.com; img-src 'self' data:; script-src 'self'"
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
      // no-store only for HTML (it may embed version-specific assets).
      if (res.req.path.endsWith('.html') || res.req.path === '/') {
        res.setHeader('Cache-Control', 'no-store');
      }
    }
  })
);

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/v1/analyze', apiLimiter, (req, res) => {
  try {
    const { password } = req.body ?? {};

    if (typeof password !== 'string') {
      log('warn', 'invalid_input', { reason: 'non-string password' });
      return res.status(400).json({
        error: 'Пароль должен быть строкой.'
      });
    }

    if (password.length === 0) {
      log('info', 'empty_password', {});
      return res.status(200).json({
        scoreLabel: 'Пусто',
        entropyBits: 0,
        estimatedTime: 'Мгновенно',
        estimatedSeconds: 0,
        strengths: [],
        weaknesses: ['Введите хотя бы один символ.']
      });
    }

    if ([...password].length > 128) {
      return res.status(400).json({
        error: 'Пароль слишком длинный. Максимум 128 символов.'
      });
    }

    const analysis = analyzePassword(password);
    log('info', 'password_analyzed', {
      length: password.length,
      entropy: analysis.entropyBits,
      score: analysis.scoreLabel
    });
    return res.json(analysis);
  } catch (err) {
    log('error', 'analyze_error', { message: err?.message ?? 'unknown' });
    return res.status(500).json({ error: 'Что-то пошло не так. Попробуйте снова позже.' });
  }
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

function log(level, message, context) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: serviceName,
    version: serviceVersion,
    msg: message,
    context
  };
  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
  } else {
    console.log(output);
  }
}
