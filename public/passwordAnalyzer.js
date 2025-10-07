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

const KEYBOARD_PATTERNS = ['qwerty', 'asdf', 'zxcv'];

export const GUESS_RATE_PER_SECOND = 1_000_000_000; // 1 billion guesses per second.

export function analyzePassword(password) {
  const normalized = String(password ?? '');
  const length = normalized.length;
  const charspace = calculateCharsetSize(normalized);
  const entropyBits = length ? length * Math.log2(charspace || 1) : 0;

  const crackSeconds = estimateBruteForceSeconds(entropyBits);
  const estimatedTime = formatDuration(crackSeconds);

  const weaknesses = identifyWeaknesses(normalized, entropyBits);
  const strengths = identifyStrengths(normalized, weaknesses, entropyBits);
  const scoreLabel = labelForEntropy(entropyBits, weaknesses);

  return {
    scoreLabel,
    entropyBits: Number(entropyBits.toFixed(2)),
    estimatedTime,
    estimatedSeconds: crackSeconds,
    strengths,
    weaknesses
  };
}

export function calculateCharsetSize(password) {
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
  if (!Number.isFinite(seconds)) {
    return Number.POSITIVE_INFINITY;
  }

  return seconds;
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
    const label = pluralize(value, unit.forms);
    parts.push(`${value.toLocaleString('ru-RU')} ${label}`);
    if (parts.length === 2) break;
  }

  return parts.length ? parts.join(' и ') : 'секунды';
}

function identifyWeaknesses(password, entropyBits) {
  const weaknesses = [];
  const uniqueChars = new Set(password);

  if (password.length < 8) {
    weaknesses.push('Меньше 8 символов — такой пароль легко перебрать.');
  }

  if (password.length >= 8 && password.length < 12) {
    weaknesses.push('Увеличьте длину до 12+ символов для заметного роста стойкости.');
  }

  if (/^(.)\1+$/.test(password)) {
    weaknesses.push('Повторяющиеся символы не добавляют стойкости.');
  }

  if (uniqueChars.size <= 2 && password.length > 2) {
    weaknesses.push('Используется слишком мало разных символов.');
  }

  const lowerPassword = password.toLowerCase();
  for (const pattern of COMMON_PATTERNS) {
    if (lowerPassword.includes(pattern)) {
      weaknesses.push('Пароль содержит популярный шаблон, который есть во взломанных базах.');
      break;
    }
  }

  if (COMMON_SEQUENCES.some((seq) => lowerPassword.includes(seq))) {
    weaknesses.push('Последовательности символов угадываются мгновенно.');
  }

  if (KEYBOARD_PATTERNS.some((seq) => lowerPassword.includes(seq))) {
    weaknesses.push('Простые клавиатурные дорожки легко распознаются.');
  }

  if (/(?:19|20)\d{2}/.test(password)) {
    weaknesses.push('Годы рождения и даты часто встречаются в паролях.');
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

  return [...new Set(weaknesses)];
}

function identifyStrengths(password, weaknesses, entropyBits) {
  const strengths = [];

  if (password.length >= 16) {
    strengths.push('Очень длинный пароль даёт запас прочности на годы.');
  } else if (password.length >= 12) {
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
  const hasCriticalWeakness = weaknesses.some((item) =>
    item.startsWith('Меньше 8') || item.startsWith('Повторяющиеся')
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
  const { one, few, many } = forms;
  const abs = Math.abs(value) % 100;
  if (abs >= 11 && abs <= 14) {
    return many;
  }

  const mod = abs % 10;
  if (mod === 1) {
    return one;
  }
  if (mod >= 2 && mod <= 4) {
    return few;
  }
  return many;
}
