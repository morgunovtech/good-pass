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

const COMMON_SEQUENCES = [
  '0123',
  '1234',
  '2345',
  '3456',
  '4567',
  '5678',
  '6789',
  '7890'
];

const KEYBOARD_PATTERNS = ['qwerty', 'asdf', 'zxcv', 'йцуке', 'фывап'];

export const GUESS_RATE_PER_SECOND = 1_000_000_000; // 1 млрд попыток в секунду

export function analyzePassword(rawPassword) {
  const password = normalizePassword(rawPassword);
  const length = password.length;

  const charsetSize = calculateCharsetSize(password);
  const entropyBits = length > 0 ? Number((length * Math.log2(Math.max(charsetSize, 1))).toFixed(2)) : 0;

  const estimatedSeconds = estimateBruteForceSeconds(entropyBits);
  const estimatedTime = formatDuration(estimatedSeconds);

  const weaknesses = collectWeaknesses(password, entropyBits);
  const strengths = collectStrengths(password, entropyBits, weaknesses);
  const scoreLabel = mapEntropyToLabel(entropyBits, weaknesses);

  return {
    scoreLabel,
    entropyBits,
    estimatedTime,
    estimatedSeconds,
    strengths,
    weaknesses
  };
}

export function calculateCharsetSize(password) {
  let size = 0;
  const hasLower = /[a-zа-яё]/.test(password);
  const hasUpper = /[A-ZА-ЯЁ]/.test(password);
  const hasDigits = /\d/.test(password);
  const hasSymbols = /[~!@#$%^&*()\-_=+\[\]{}|;:'",.<>/?`\\]/.test(password);
  const hasSpace = /\s/.test(password);
  const hasNonAscii = /[^\x00-\x7F]/.test(password);

  if (hasLower) size += 26; // латиница
  if (hasUpper) size += 26;
  if (/[а-яё]/.test(password)) size += 33;
  if (/[А-ЯЁ]/.test(password)) size += 33;
  if (hasDigits) size += 10;
  if (hasSymbols) size += 33;
  if (hasSpace) size += 1;
  if (hasNonAscii) size += 100; // запас для остального Юникода

  if (size === 0) {
    size = new Set(password).size || 1;
  }

  return size;
}

export function estimateBruteForceSeconds(entropyBits) {
  if (!Number.isFinite(entropyBits) || entropyBits <= 0) {
    return 0;
  }

  const logSeconds = entropyBits - Math.log2(GUESS_RATE_PER_SECOND);
  const seconds = Math.pow(2, logSeconds);
  return Number.isFinite(seconds) ? seconds : Number.POSITIVE_INFINITY;
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds > 1e18) {
    return 'Практически не поддаётся перебору';
  }

  if (seconds <= 1) {
    return 'Мгновенно';
  }

  const units = [
    { seconds: 31_536_000, forms: { one: 'год', few: 'года', many: 'лет' } },
    { seconds: 86_400, forms: { one: 'день', few: 'дня', many: 'дней' } },
    { seconds: 3_600, forms: { one: 'час', few: 'часа', many: 'часов' } },
    { seconds: 60, forms: { one: 'минута', few: 'минуты', many: 'минут' } },
    { seconds: 1, forms: { one: 'секунда', few: 'секунды', many: 'секунд' } }
  ];

  let remaining = Math.round(seconds);
  const parts = [];

  for (const unit of units) {
    if (remaining < unit.seconds) continue;
    const value = Math.floor(remaining / unit.seconds);
    remaining -= value * unit.seconds;
    parts.push(`${value.toLocaleString('ru-RU')} ${pluralize(value, unit.forms)}`);
    if (parts.length === 2) break;
  }

  return parts.length ? parts.join(' и ') : 'секунды';
}

function normalizePassword(input) {
  if (typeof input === 'string') return input;
  if (input === null || input === undefined) return '';
  return String(input);
}

function collectWeaknesses(password, entropyBits) {
  const weaknesses = [];
  const length = password.length;
  const uniqueChars = new Set(password);
  const lower = password.toLowerCase();

  if (length === 0) {
    return weaknesses;
  }

  if (length < 8) {
    weaknesses.push('Меньше 8 символов — такой пароль легко перебрать.');
  } else if (length < 12) {
    weaknesses.push('Увеличьте длину до 12+ символов для заметного роста стойкости.');
  }

  if (/^(.)\1+$/.test(password)) {
    weaknesses.push('Повторяющиеся символы не добавляют стойкости.');
  }

  if (uniqueChars.size <= 2 && length > 3) {
    weaknesses.push('Используется слишком мало разных символов.');
  }

  if (COMMON_SEQUENCES.some((sequence) => lower.includes(sequence))) {
    weaknesses.push('Последовательности символов угадываются мгновенно.');
  }

  if (KEYBOARD_PATTERNS.some((pattern) => lower.includes(pattern))) {
    weaknesses.push('Простые клавиатурные дорожки легко распознаются.');
  }

  for (const pattern of COMMON_PATTERNS) {
    if (lower.includes(pattern)) {
      weaknesses.push('Пароль содержит популярный шаблон из слитых баз.');
      break;
    }
  }

  if (/(?:19|20)\d{2}/.test(password)) {
    weaknesses.push('Годы рождения и даты часто встречаются в паролях.');
  }

  if (entropyBits < 36) {
    weaknesses.push('Низкая энтропия — комбинируйте разные типы символов.');
  }

  if (!/[A-Za-zА-Яа-яЁё]/.test(password)) {
    weaknesses.push('Добавьте буквы, чтобы расширить набор символов.');
  }

  if (!/\d/.test(password)) {
    weaknesses.push('Цифры усложняют перебор и полезны для стойкости.');
  }

  if (!/[~!@#$%^&*()\-_=+\[\]{}|;:'",.<>/?`\\]/.test(password)) {
    weaknesses.push('Спецсимволы увеличивают энтропию, если их удобно запомнить.');
  }

  return dedupe(weaknesses);
}

function collectStrengths(password, entropyBits, weaknesses) {
  const strengths = [];
  const length = password.length;

  if (length >= 16) {
    strengths.push('Очень длинный пароль даёт запас прочности на годы.');
  } else if (length >= 12) {
    strengths.push('Длина 12+ символов резко повышает стойкость.');
  }

  if (/[A-ZА-ЯЁ]/.test(password) && /[a-zа-яё]/.test(password)) {
    strengths.push('Смешанный регистр усложняет угадывание.');
  }

  if (/[A-Za-zА-Яа-яЁё]/.test(password) && /\d/.test(password)) {
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

  const weaknessSet = new Set(weaknesses);
  return dedupe(strengths.filter((item) => !weaknessSet.has(item)));
}

function mapEntropyToLabel(entropyBits, weaknesses) {
  const hasCriticalWeakness = weaknesses.some((item) =>
    item.startsWith('Меньше 8') || item.startsWith('Повторяющиеся символы')
  );

  if (entropyBits < 28 || hasCriticalWeakness) {
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

function pluralize(value, forms) {
  const abs = Math.abs(value) % 100;
  if (abs >= 11 && abs <= 14) {
    return forms.many;
  }

  const mod = abs % 10;
  if (mod === 1) {
    return forms.one;
  }
  if (mod >= 2 && mod <= 4) {
    return forms.few;
  }
  return forms.many;
}

function dedupe(items) {
  return [...new Set(items)];
}
