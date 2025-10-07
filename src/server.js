import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { analyzePassword } from './passwordAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const serviceName = 'good-pass-service';
const serviceVersion = '2024.10.07';

app.disable('x-powered-by');
app.use(express.json({ limit: '5kb' }));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'interest-cohort=()');
  next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/analyze', (req, res) => {
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
      strengths: [],
      weaknesses: ['Введите хотя бы один символ.']
    });
  }

  const analysis = analyzePassword(password);
  log('info', 'password_analyzed', {
    length: password.length,
    entropy: analysis.entropyBits,
    score: analysis.scoreLabel
  });
  return res.json(analysis);
});

app.use((err, req, res, next) => {
  log('error', 'unhandled_error', { message: err?.message ?? 'unknown' });
  res.status(500).json({ error: 'Что-то пошло не так. Попробуйте снова позже.' });
});

app.listen(port, () => {
  log('info', 'server_started', { port });
});

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
