import { messagesFor } from './i18n/index.js';

export { pluralize } from './i18n/ru.js';

// The analysis works with codes (score "very_weak", weakness "too_short", …);
// the texts in the asked language come from src/i18n/ at the very end.

// Shared regex for special/symbol characters — used in charset, weaknesses, and strengths.
const SYMBOL_REGEX = /[~!@#$%^&*()\-_=+\[\]{}|;:'",.<>/?`\\]/;

const COMMON_PATTERNS = [
  'password', 'qwerty', 'letmein', 'welcome', 'admin', 'login',
  'abc123', '1111', '1234', '12345', '123456', '12345678', '123456789',
  'iloveyou', 'monkey', 'dragon', 'master', 'shadow', 'sunshine',
  'princess', 'football', 'charlie', 'trustno1', 'hunter', 'ranger',
  'buster', 'thomas', 'robert', 'batman', 'access', 'hello',
  'michael', 'superman', 'starwars', 'passw0rd', 'baseball',
  'mustang', 'soccer', 'hockey', 'killer', 'george', 'phoenix',
  'andrew', 'joshua', 'summer', 'secret', 'flower', 'hottie',
  'loveme', 'freedom', 'whatever', 'nicole', 'jordan', 'jennifer',
  'amanda', 'daniel', 'matthew', 'ginger', 'pepper', 'jessica',
  'silver', 'cookie', 'ashley', 'bailey', 'hannah', 'jasper',
  'maggie', 'bandit', 'yankees', 'lakers', 'junior', 'trigger',
  'harley', 'sparky', 'dallas', 'london', 'merlin', 'diamond',
  'golfer', 'cheese', 'arsenal', 'chelsea', 'falcon', 'winner',
  'orange', 'purple', 'peanut', 'butter', 'compaq', 'cowboy',
  'chicken', 'samson', 'apple', 'toyota', 'marina', 'austin',
  'dakota', 'maverick', 'matrix', 'hammer', 'murphy', 'guitar',
  'letmein', 'angel', 'tiger', 'fender', 'bigdog', 'wizard',
  'corvette', 'bulldog', 'midnight', 'computer', 'internet', 'asshole',
  'fuckyou', 'thunder', 'panther', 'elephant', 'nothing', 'yankee',
  'jackson', 'camaro', 'steelers', 'dolphins', 'eagles', 'boomer',
  'spider', 'abcdef', 'abcabc', 'qazwsx', 'qwert', 'zxcvbn',
  'пароль', 'привет', 'любовь', 'россия', 'москва', 'солнце',
  'дракон', 'мастер', 'футбол', 'лето', 'тайна', 'звезда'
];

const COMMON_SEQUENCES = [
  '0123', '1234', '2345', '3456', '4567', '5678', '6789', '7890'
];

const KEYBOARD_PATTERNS = [
  // Latin QWERTY
  'qwerty', 'qwert', 'asdf', 'asdfg', 'zxcv', 'zxcvb',
  'qazwsx', 'poiuy', 'lkjhg', 'mnbvc',
  // Russian JCUKEN
  'йцукен', 'йцуке', 'фыва', 'фывап', 'ячсми', 'ячсм',
  'ёйцуке', 'олджэ', 'ячсмит'
];

// L33t-speak substitution map.
const LEET_MAP = {
  '@': 'a', '4': 'a', '8': 'b', '(': 'c', '3': 'e',
  '6': 'g', '#': 'h', '1': 'i', '!': 'i', '|': 'l',
  '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't',
  '%': 'x', '2': 'z'
};

export const GUESS_RATE_PER_SECOND = 1_000_000_000; // 1 billion guesses per second.

export function analyzePassword(password, lang) {
  const m = messagesFor(lang);
  const normalized = String(password ?? '');
  const length = [...normalized].length; // Correct length for emoji / surrogate pairs.
  const charspace = calculateCharsetSize(normalized);
  const rawEntropy = length ? length * Math.log2(charspace || 1) : 0;

  const weaknessCodes = identifyWeaknesses(normalized, rawEntropy);
  const penalty = calculatePenalty(normalized);
  const entropyBits = rawEntropy * penalty;

  const crackSeconds = estimateBruteForceSeconds(entropyBits);
  const strengthCodes = identifyStrengths(normalized, entropyBits);
  const score = scoreForEntropy(entropyBits, weaknessCodes);

  return {
    scoreLabel: m.score[score],
    entropyBits: Number(entropyBits.toFixed(2)),
    estimatedTime: formatDuration(crackSeconds, lang),
    estimatedSeconds: crackSeconds,
    strengths: strengthCodes.map((code) => m.strengths[code]),
    weaknesses: weaknessCodes.map((code) => m.weaknesses[code]),
    // The same in every language: what a client checks instead of the texts.
    score,
    weaknessCodes
  };
}

export function calculateCharsetSize(password) {
  let size = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigits = /\d/.test(password);
  const hasSymbols = SYMBOL_REGEX.test(password);
  const hasSpace = /\s/.test(password);
  const hasCyrillic = /[а-яёА-ЯЁ]/.test(password);
  const hasOtherUnicode = /[^\x00-\x7Fа-яёА-ЯЁ]/.test(password);

  if (hasLower) size += 26;
  if (hasUpper) size += 26;
  if (hasDigits) size += 10;
  if (hasSymbols) size += 33; // printable ASCII punctuation.
  if (hasSpace) size += 1;
  if (hasCyrillic) size += 66; // 33 lower + 33 upper Cyrillic letters.
  if (hasOtherUnicode) size += 100; // conservative bucket for other Unicode.

  if (size === 0) {
    size = new Set([...password]).size || 1;
  }

  return size;
}

/**
 * Penalty factor (0..1) that reduces raw entropy for passwords with
 * repetitive patterns, low unique-char ratio, or dictionary content.
 */
function calculatePenalty(password) {
  const chars = [...password];
  const length = chars.length;
  if (length === 0) return 1;

  let penalty = 1;

  // Repetition: ratio of unique chars to total length.
  const uniqueRatio = new Set(chars).size / length;
  if (uniqueRatio < 0.4) penalty *= 0.5;
  else if (uniqueRatio < 0.6) penalty *= 0.75;

  // All-same character.
  if (/^(.)\1+$/u.test(password)) {
    penalty *= 0.1;
  }

  // Sequential repetition ("abcabcabc").
  for (let chunk = 1; chunk <= Math.floor(length / 2); chunk++) {
    const slice = password.slice(0, chunk);
    if (slice.repeat(Math.ceil(length / chunk)).slice(0, length) === password) {
      penalty *= 0.3;
      break;
    }
  }

  // L33t-decoded matches against common patterns.
  const decoded = decodeLeet(password);
  const lower = password.toLowerCase();
  for (const pattern of COMMON_PATTERNS) {
    if (lower === pattern || decoded === pattern) {
      penalty *= 0.15;
      break;
    }
    if (lower.includes(pattern) || decoded.includes(pattern)) {
      penalty *= 0.5;
      break;
    }
  }

  return Math.max(penalty, 0.05);
}

function decodeLeet(password) {
  return [...password.toLowerCase()]
    .map(ch => LEET_MAP[ch] || ch)
    .join('');
}

export function estimateBruteForceSeconds(entropyBits) {
  if (!Number.isFinite(entropyBits) || entropyBits <= 0) {
    return 0;
  }

  const logSeconds = entropyBits - Math.log2(GUESS_RATE_PER_SECOND);
  const seconds = Math.pow(2, logSeconds);
  if (!Number.isFinite(seconds)) {
    return Number.POSITIVE_INFINITY;
  }

  return seconds;
}

const TIME_UNITS = [
  { seconds: 31_536_000, unit: 'year' },
  { seconds: 86_400, unit: 'day' },
  { seconds: 3_600, unit: 'hour' },
  { seconds: 60, unit: 'minute' },
  { seconds: 1, unit: 'second' }
];

export function formatDuration(seconds, lang) {
  const m = messagesFor(lang);
  if (!Number.isFinite(seconds) || seconds > 1e18) {
    return m.time.beyond;
  }

  if (seconds <= 1) {
    return m.time.instant;
  }

  let remaining = Math.round(seconds);
  const parts = [];

  for (const { seconds: size, unit } of TIME_UNITS) {
    if (remaining < size) continue;
    const value = Math.floor(remaining / size);
    remaining -= value * size;
    const label = m.plural(value, m.time.units[unit]);
    parts.push(`${value.toLocaleString(m.locale)} ${label}`);
    if (parts.length === 2) break;
  }

  return parts.length ? parts.join(m.time.and) : m.time.underSecond;
}

function identifyWeaknesses(password, entropyBits) {
  const weaknesses = [];
  const chars = [...password];
  const length = chars.length;
  const uniqueChars = new Set(chars);

  if (length < 8) {
    weaknesses.push('too_short');
  }

  if (length >= 8 && length < 12) {
    weaknesses.push('short');
  }

  if (/^(.)\1+$/u.test(password)) {
    weaknesses.push('repeated');
  }

  if (uniqueChars.size <= 2 && length > 2) {
    weaknesses.push('few_unique');
  }

  const lowerPassword = password.toLowerCase();
  const leetDecoded = decodeLeet(password);

  for (const pattern of COMMON_PATTERNS) {
    if (lowerPassword.includes(pattern) || leetDecoded.includes(pattern)) {
      weaknesses.push('common_pattern');
      break;
    }
  }

  if (COMMON_SEQUENCES.some((seq) => lowerPassword.includes(seq))) {
    weaknesses.push('sequence');
  }

  if (KEYBOARD_PATTERNS.some((seq) => lowerPassword.includes(seq))) {
    weaknesses.push('keyboard');
  }

  // Date patterns: YYYY, DD/MM/YYYY-like, DDMMYYYY.
  if (/(?:19|20)\d{2}/.test(password) || /\d{2}[./-]\d{2}[./-]\d{4}/.test(password)) {
    weaknesses.push('date');
  }

  if (entropyBits < 36) {
    weaknesses.push('low_entropy');
  }

  if (!/[A-Za-zа-яёА-ЯЁ]/.test(password)) {
    weaknesses.push('no_letters');
  }

  if (!/\d/.test(password)) {
    weaknesses.push('no_digits');
  }

  if (!SYMBOL_REGEX.test(password)) {
    weaknesses.push('no_symbols');
  }

  return [...new Set(weaknesses)];
}

function identifyStrengths(password, entropyBits) {
  const chars = [...password];
  const length = chars.length;
  const strengths = [];

  if (length >= 16) {
    strengths.push('very_long');
  } else if (length >= 12) {
    strengths.push('long');
  }

  if (/[A-ZА-ЯЁ]/u.test(password) && /[a-zа-яё]/u.test(password)) {
    strengths.push('mixed_case');
  }

  if (/\d/.test(password) && /[A-Za-zа-яёА-ЯЁ]/.test(password)) {
    strengths.push('letters_digits');
  }

  if (SYMBOL_REGEX.test(password)) {
    strengths.push('symbols');
  }

  if (/[^\x00-\x7F]/.test(password)) {
    strengths.push('unicode');
  }

  if (entropyBits >= 60) {
    strengths.push('high_entropy');
  }

  return strengths;
}

function scoreForEntropy(entropyBits, weaknessCodes) {
  const hasCriticalWeakness = weaknessCodes.includes('too_short') || weaknessCodes.includes('repeated');

  if (entropyBits < 28 || hasCriticalWeakness) {
    return 'very_weak';
  }
  if (entropyBits < 36) {
    return 'weak';
  }
  if (entropyBits < 60) {
    return 'medium';
  }
  if (entropyBits < 90) {
    return 'strong';
  }
  return 'excellent';
}
