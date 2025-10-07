import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const serviceName = 'good-pass-service';
const serviceVersion = '2024.04.00';

app.use(express.json({ limit: '5kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), {
  setHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
  }
}));

const COMMON_PATTERNS = [
  'password',
  'qwerty',
  'letmein',
  'welcome',
  'admin',
  'login',
  'abc123',
  '1111',
  '1234',
  '12345',
  '123456',
  '12345678',
  '123456789',
  'iloveyou'
];

const GUESS_RATE_PER_SECOND = 1_000_000_000; // 1 billion guesses per second.

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

function analyzePassword(password) {
  const length = password.length;
  const charspace = calculateCharsetSize(password);
  const entropyBits = length * Math.log2(charspace || 1);

  const estimatedCrackSeconds = estimateBruteForceSeconds(entropyBits);
  const estimatedTime = formatDuration(estimatedCrackSeconds);

  const weaknesses = identifyWeaknesses(password, entropyBits);
  const strengths = identifyStrengths(password, weaknesses, entropyBits);

  const scoreLabel = labelForEntropy(entropyBits, weaknesses);

  return {
    scoreLabel,
    entropyBits: Number(entropyBits.toFixed(2)),
    estimatedTime,
    strengths,
    weaknesses
  };
}

function calculateCharsetSize(password) {
  let size = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigits = /\d/.test(password);
  const hasSymbols = /[~!@#$%^&*()\-_=+\[\]{}|;:'",.<>/?`\\]/.test(password);
  const hasSpace = /\s/.test(password);
  const hasNonAscii = /[^\x00-\x7F]/.test(password);

  if (hasLower) size += 26;
  if (hasUpper) size += 26;
  if (hasDigits) size += 10;
  if (hasSymbols) size += 33; // printable ASCII punctuation.
  if (hasSpace) size += 1;
  if (hasNonAscii) size += 100; // conservative bucket for Unicode.

  // Fallback minimal charset.
  if (size === 0) {
    size = new Set(password).size || 1;
  }

  return size;
}

function estimateBruteForceSeconds(entropyBits) {
  if (entropyBits <= 0) {
    return 0;
  }

  const logSeconds = entropyBits - Math.log2(GUESS_RATE_PER_SECOND);
  const seconds = Math.pow(2, logSeconds);
  if (!Number.isFinite(seconds)) {
    return Number.POSITIVE_INFINITY;
  }

  return seconds;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds > 1e18) {
    return 'Практически не поддаётся перебору';
  }

  if (seconds <= 1) {
    return 'Мгновенно';
  }

  const units = [
    { label: 'лет', seconds: 31_536_000 },
    { label: 'дней', seconds: 86_400 },
    { label: 'часов', seconds: 3_600 },
    { label: 'минут', seconds: 60 },
    { label: 'секунд', seconds: 1 }
  ];

  let remaining = Math.round(seconds);
  const parts = [];

  for (const unit of units) {
    if (remaining < unit.seconds) continue;
    const value = Math.floor(remaining / unit.seconds);
    remaining -= value * unit.seconds;
    parts.push(`${value.toLocaleString('ru-RU')} ${unit.label}`);
    if (parts.length === 2) break;
  }

  return parts.length ? parts.join(' и ') : 'секунды';
}

function identifyWeaknesses(password, entropyBits) {
  const weaknesses = [];
  if (password.length < 8) {
    weaknesses.push('Меньше 8 символов — такой пароль легко перебрать.');
  }

  if (/^(.)\1+$/.test(password)) {
    weaknesses.push('Повторяющиеся символы не добавляют стойкости.');
  }

  if (/^(?:0123|1234|2345|3456|4567|5678|6789|7890)$/.test(password)) {
    weaknesses.push('Последовательности цифр угадываются мгновенно.');
  }

  const lowerPassword = password.toLowerCase();
  for (const pattern of COMMON_PATTERNS) {
    if (lowerPassword.includes(pattern)) {
      weaknesses.push('Пароль содержит популярный шаблон, который есть во взломанных базах.');
      break;
    }
  }

  if (entropyBits < 36) {
    weaknesses.push('Низкая энтропия — комбинируйте разные типы символов.');
  }

  if (!/[A-Za-z]/.test(password)) {
    weaknesses.push('Добавьте буквы, чтобы увеличить пространство вариантов.');
  }

  if (!/\d/.test(password)) {
    weaknesses.push('Цифры усложняют перебор и полезны для стойкости.');
  }

  if (!/[~!@#$%^&*()\-_=+\[\]{}|;:'",.<>/?`\\]/.test(password)) {
    weaknesses.push('Спецсимволы увеличивают энтропию, если их удобно запомнить.');
  }

  return weaknesses;
}

function identifyStrengths(password, weaknesses, entropyBits) {
  const strengths = [];
  if (password.length >= 12) {
    strengths.push('Длина 12+ символов резко повышает стойкость.');
  }

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    strengths.push('Смешанный регистр усложняет угадывание.');
  }

  if (/\d/.test(password) && /[A-Za-z]/.test(password)) {
    strengths.push('Комбинация букв и цифр создаёт больше вариантов.');
  }

  if (/[~!@#$%^&*()\-_=+\[\]{}|;:'",.<>/?`\\]/.test(password)) {
    strengths.push('Спецсимволы добавляют энтропию.');
  }

  if (/[^\x00-\x7F]/.test(password)) {
    strengths.push('Юникод-символы расширяют алфавит, если сервис их поддерживает.');
  }

  if (entropyBits >= 60) {
    strengths.push('Высокая энтропия — пароль устойчив к перебору.');
  }

  const uniqueStrengths = strengths.filter((item) => !weaknesses.includes(item));
  return uniqueStrengths;
}

function labelForEntropy(entropyBits, weaknesses) {
  if (entropyBits < 28 || weaknesses.includes('Введите хотя бы один символ.')) {
    return 'Очень слабый';
  }
  if (entropyBits < 36) {
    return 'Слабый';
  }
  if (entropyBits < 60) {
    return 'Средний';
  }
  if (entropyBits < 90) {
    return 'Сильный';
  }
  return 'Отличный';
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
