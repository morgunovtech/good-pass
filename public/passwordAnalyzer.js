const LATIN_COMMON = [
  'password',
  'qwerty',
  'letmein',
  'welcome',
  'dragon',
  'sunshine',
  'football',
  'princess',
  'monkey',
  'iloveyou',
  'admin',
  'login'
];

const RUSSIAN_COMMON = [
  'пароль',
  'добро',
  'люблю',
  'привет',
  'йцукен',
  'саша',
  'мария',
  'сергей',
  'почта',
  'qwerty',
  'ромашка',
  'дома',
  'домой'
];

const RUSSIAN_MONTHS = [
  'январ',
  'феврал',
  'март',
  'апрел',
  'ма',
  'июн',
  'июл',
  'август',
  'сентябр',
  'октябр',
  'ноябр',
  'декабр'
];

const NAME_FRAGMENTS = [
  'ivan',
  'anna',
  'maria',
  'sergey',
  'alex',
  'olga',
  'svet',
  'dima',
  'natal',
  'petr',
  'nik',
  'oleg'
];

const COMMON_SEQUENCES = [
  '0123',
  '1234',
  '2345',
  '3456',
  '4567',
  '5678',
  '6789',
  '7890',
  'abcd',
  'qwer',
  'йцу',
  'фыв'
];

const KEYBOARD_ROWS = [
  '1234567890',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'йцукенгшщзхъ',
  'фывапролджэ',
  'ячсмитьбю'
];

const HOMOGLYPH_SETS = [
  ['a', 'а'],
  ['e', 'е', 'ё'],
  ['o', 'о'],
  ['p', 'р'],
  ['c', 'с'],
  ['x', 'х'],
  ['y', 'у'],
  ['k', 'к'],
  ['h', 'н'],
  ['m', 'м'],
  ['b', 'в'],
  ['t', 'т']
];

const LAYOUT_MAPPINGS = {
  enToRu: {
    q: 'й',
    w: 'ц',
    e: 'у',
    r: 'к',
    t: 'е',
    y: 'н',
    u: 'г',
    i: 'ш',
    o: 'щ',
    p: 'з',
    '[': 'х',
    ']': 'ъ',
    a: 'ф',
    s: 'ы',
    d: 'в',
    f: 'а',
    g: 'п',
    h: 'р',
    j: 'о',
    k: 'л',
    l: 'д',
    ';': 'ж',
    "'": 'э',
    z: 'я',
    x: 'ч',
    c: 'с',
    v: 'м',
    b: 'и',
    n: 'т',
    m: 'ь',
    ',': 'б',
    '.': 'ю'
  },
  ruToEn: {
    й: 'q',
    ц: 'w',
    у: 'e',
    к: 'r',
    е: 't',
    н: 'y',
    г: 'u',
    ш: 'i',
    щ: 'o',
    з: 'p',
    х: '[',
    ъ: ']',
    ф: 'a',
    ы: 's',
    в: 'd',
    а: 'f',
    п: 'g',
    р: 'h',
    о: 'j',
    л: 'k',
    д: 'l',
    ж: ';',
    э: "'",
    я: 'z',
    ч: 'x',
    с: 'c',
    м: 'v',
    и: 'b',
    т: 'n',
    ь: 'm',
    б: ',',
    ю: '.'
  }
};

const DICEWARE_WORDLIST_SIZE = 2048;

export const ATTACK_PROFILES = [
  {
    id: 'online',
    label: 'Online',
    description: 'Ограниченные попытки, блокировки после ошибок.',
    baseGuessRate: 150
  },
  {
    id: 'offline',
    label: 'Offline',
    description: 'Утекшие хэши и полный контроль над оборудованием.',
    baseGuessRate: 5_000_000_000
  }
];

export const HASH_PROFILES = [
  {
    id: 'md5',
    label: 'MD5 / SHA-1 (без соли)',
    slowdown: 1,
    description: 'Практически не замедляет перебор — устаревшая схема.'
  },
  {
    id: 'sha256',
    label: 'SHA-256 (соль, 1 раунд)',
    slowdown: 8,
    description: 'Хэш медленнее, но всё ещё быстро для GPU атак.'
  },
  {
    id: 'bcrypt12',
    label: 'bcrypt cost 12',
    slowdown: 12_000,
    description: 'Замедление ~12 тыс. раз по сравнению с MD5.'
  },
  {
    id: 'argon2id',
    label: 'Argon2id (профиль OWASP)',
    slowdown: 45_000,
    description: 'Память + вычисления дают существенную защиту от перебора.'
  }
];

export function analyzePassword(rawPassword, options = {}) {
  const password = normalizePassword(rawPassword);
  const { attackProfile: attackId = 'offline', hashProfile: hashId = 'argon2id' } = options;

  const attack = ATTACK_PROFILES.find((profile) => profile.id === attackId) ?? ATTACK_PROFILES[1];
  const hash = HASH_PROFILES.find((profile) => profile.id === hashId) ?? HASH_PROFILES[HASH_PROFILES.length - 1];

  const guessRate = resolveGuessRate(attack, hash);

  const length = password.length;
  const charsetSize = calculateCharsetSize(password);
  const entropyBits = length > 0 ? Number((length * Math.log2(Math.max(charsetSize, 1))).toFixed(2)) : 0;
  const passphrase = analyzePassphrase(password);
  const estimatedSeconds = estimateBruteForceSeconds(entropyBits, guessRate);
  const estimatedTime = formatDuration(estimatedSeconds);

  const patternMatches = detectPatterns(password);
  const detectors = runDetectors(password, passphrase, patternMatches);
  const weaknesses = collectWeaknesses(password, entropyBits, patternMatches, detectors, passphrase);
  const strengths = collectStrengths(password, entropyBits, weaknesses, passphrase);
  const scoreLabel = mapEntropyToLabel(entropyBits, weaknesses, detectors, passphrase);

  return {
    scoreLabel,
    entropyBits,
    estimatedTime,
    estimatedSeconds,
    strengths,
    weaknesses,
    patternMatches,
    detectors,
    passphrase,
    guessRate,
    attack,
    hash,
    guessFormula: buildGuessFormula(entropyBits, guessRate, attack, hash)
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

  if (hasLower) size += 26;
  if (hasUpper) size += 26;
  if (/[а-яё]/.test(password)) size += 33;
  if (/[А-ЯЁ]/.test(password)) size += 33;
  if (hasDigits) size += 10;
  // Printable ASCII punctuation (без пробела) ≈ 32 символа — корректировка для формулы H = L * log2(S)
  if (hasSymbols) size += 32;
  if (hasSpace) size += 1;
  if (hasNonAscii) size += 100;

  if (size === 0) {
    size = new Set(password).size || 1;
  }

  return size;
}

export function estimateBruteForceSeconds(entropyBits, guessRate) {
  if (!Number.isFinite(entropyBits) || entropyBits <= 0) {
    return 0;
  }

  const rate = guessRate && guessRate > 0 ? guessRate : ATTACK_PROFILES[1].baseGuessRate;
  const logSeconds = entropyBits - Math.log2(rate);
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

function resolveGuessRate(attack, hash) {
  const base = attack?.baseGuessRate ?? ATTACK_PROFILES[1].baseGuessRate;
  const slowdown = hash?.slowdown ?? 1;
  const rate = base / slowdown;
  return rate > 0 ? rate : ATTACK_PROFILES[1].baseGuessRate;
}

function buildGuessFormula(entropyBits, guessRate, attack, hash) {
  if (!entropyBits) {
    return 'Время рассчитывается как 2^энтропии / скорость подбора.';
  }

  const entropyPart = `2^${entropyBits}`;
  const ratePart = formatNumber(Math.max(Math.round(guessRate), 1));
  return `T ≈ ${entropyPart} / ${ratePart} попыток/с (${attack.label} · ${hash.label})`;
}

function detectPatterns(password) {
  const lower = password.toLowerCase();
  const matches = [];

  if (!password) {
    return matches;
  }

  const dictionaries = [
    { label: 'английских слов', list: LATIN_COMMON },
    { label: 'русских слов', list: RUSSIAN_COMMON },
    { label: 'фрагментов имён', list: NAME_FRAGMENTS }
  ];

  for (const dictionary of dictionaries) {
    for (const word of dictionary.list) {
      if (lower.includes(word)) {
        matches.push(`Обнаружено популярное слово из ${dictionary.label}: «${word}».`);
        break;
      }
    }
  }

  for (const sequence of COMMON_SEQUENCES) {
    if (lower.includes(sequence) || lower.includes([...sequence].reverse().join(''))) {
      matches.push('Последовательности вроде "1234" угадываются мгновенно.');
      break;
    }
  }

  if (/([a-zа-яё0-9])\1{2,}/i.test(password)) {
    matches.push('Повторяющиеся символы и блоки легко сокращают перебор.');
  }

  const layoutWord = detectLayoutWord(password);
  if (layoutWord) {
    matches.push(`Похоже на слово «${layoutWord.word}», набранное в раскладке ${layoutWord.layout}.`);
  }

  const leetCandidate = normaliseLeet(lower);
  if (leetCandidate && leetCandidate !== lower) {
    for (const word of [...LATIN_COMMON, ...NAME_FRAGMENTS]) {
      if (leetCandidate.includes(word)) {
        matches.push('Лит-замены вроде «@» → «a» распознаются словарными атаками.');
        break;
      }
    }
  }

  return dedupe(matches);
}

function runDetectors(password, passphrase, patternMatches) {
  return {
    personalData: detectPersonalData(password),
    homoglyphs: detectHomoglyphs(password),
    layout: detectLayoutIssues(password, passphrase, patternMatches),
    keyboardWalk: detectKeyboardWalk(password)
  };
}

function detectPersonalData(password) {
  const findings = [];
  const lower = password.toLowerCase();

  if (/\b\d{2}[\.\/-]\d{2}[\.\/-]\d{2,4}\b/.test(password) || /(\d{4})(\d{2})(\d{2})/.test(password)) {
    findings.push('Похоже на дату — такие данные легко найти в соцсетях.');
  }

  if (/(?:\+7|8)\d{10}/.test(password.replace(/[\s()-]/g, ''))) {
    findings.push('Номер телефона — уязвимый источник персональных данных.');
  }

  if (/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i.test(password)) {
    findings.push('E-mail в пароле связывает его с конкретной учёткой.');
  }

  for (const month of RUSSIAN_MONTHS) {
    if (lower.includes(month)) {
      findings.push('Встречаются фрагменты месяца — часто часть даты рождения.');
      break;
    }
  }

  for (const fragment of NAME_FRAGMENTS) {
    if (lower.includes(fragment)) {
      findings.push('Фрагменты имени делают подбор проще для знакомых.');
      break;
    }
  }

  return buildDetectorResult('Персональные данные', findings);
}

function detectHomoglyphs(password) {
  const findings = [];

  for (const set of HOMOGLYPH_SETS) {
    const present = set.filter((char) => password.includes(char) || password.includes(char.toUpperCase()));
    if (present.length > 1) {
      findings.push('Смешение похожих кириллических и латинских символов может запутать вас, но не брутфорс.');
      break;
    }
  }

  return buildDetectorResult('Гомоглифы', findings);
}

function detectLayoutIssues(password, passphrase, patternMatches) {
  const findings = [];
  if (/[A-Za-z]/.test(password) && /[А-Яа-яЁё]/.test(password)) {
    findings.push('Микс кириллицы и латиницы часто означает ошибки раскладки.');
  }

  if (patternMatches.some((item) => item.includes('раскладке'))) {
    findings.push('Обнаружены слова, набранные в другой раскладке — их легко восстановить.');
  }

  if (passphrase?.looksLikeDiceware && passphrase?.wordCount < 4) {
    findings.push('Для коротких пасфраз добавьте ещё слова — минимум четыре.');
  }

  return buildDetectorResult('Раскладка', findings);
}

function detectKeyboardWalk(password) {
  const findings = [];
  const lower = password.toLowerCase();
  for (const row of KEYBOARD_ROWS) {
    const reversed = [...row].reverse().join('');
    if (hasSequentialSubstring(lower, row, 4) || hasSequentialSubstring(lower, reversed, 4)) {
      findings.push('Длинные дорожки по клавиатуре мгновенно распознаются ботами.');
      break;
    }
  }

  return buildDetectorResult('Дорожки клавиатуры', findings);
}

function analyzePassphrase(password) {
  if (!password) {
    return { wordCount: 0, entropyPerWord: 0, totalEntropy: 0, looksLikeDiceware: false };
  }

  const separatorMatch = password.match(/[\s\-_.]+/g);
  if (!separatorMatch) {
    return { wordCount: 0, entropyPerWord: 0, totalEntropy: 0, looksLikeDiceware: false };
  }

  const words = password
    .split(/[\s\-_.]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const wordCount = words.length;
  if (wordCount < 2) {
    return { wordCount: 0, entropyPerWord: 0, totalEntropy: 0, looksLikeDiceware: false };
  }

  const looksLikeDiceware = words.every((word) => /^[a-zа-яё]+$/i.test(word) && word.length >= 3);
  const entropyPerWord = looksLikeDiceware ? Number(Math.log2(DICEWARE_WORDLIST_SIZE).toFixed(2)) : 0;
  const totalEntropy = looksLikeDiceware ? Number((entropyPerWord * wordCount).toFixed(2)) : 0;

  return { wordCount, entropyPerWord, totalEntropy, looksLikeDiceware };
}

function collectWeaknesses(password, entropyBits, patternMatches, detectors, passphrase) {
  const weaknesses = [];
  const length = password.length;

  if (!password) {
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

  if (new Set(password).size <= 2 && length > 3) {
    weaknesses.push('Используется слишком мало разных символов.');
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

  weaknesses.push(...patternMatches);

  for (const detector of Object.values(detectors)) {
    if (detector.flagged) {
      weaknesses.push(...detector.details);
    }
  }

  if (passphrase.looksLikeDiceware && passphrase.wordCount < 4) {
    weaknesses.push('Добавьте минимум 4 слова в пасфразу, чтобы получить ощутимую стойкость.');
  }

  return dedupe(weaknesses);
}

function collectStrengths(password, entropyBits, weaknesses, passphrase) {
  const strengths = [];
  const length = password.length;

  if (!password) {
    return strengths;
  }

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

  if (passphrase.looksLikeDiceware && passphrase.wordCount >= 4) {
    strengths.push('Пасфраза из 4+ слов даёт устойчивость и легко запоминается.');
  }

  const weaknessSet = new Set(weaknesses);
  return dedupe(strengths.filter((item) => !weaknessSet.has(item)));
}

function mapEntropyToLabel(entropyBits, weaknesses, detectors, passphrase) {
  const hasCriticalWeakness = weaknesses.some((item) =>
    item.startsWith('Меньше 8') || item.startsWith('Повторяющиеся символы')
  );

  const flaggedDetectors = Object.values(detectors).some((detector) => detector.flagged);

  if (entropyBits < 28 || hasCriticalWeakness) {
    return 'Очень слабый';
  }

  if (entropyBits < 36 || flaggedDetectors) {
    return 'Слабый';
  }

  if (entropyBits < 60 && !(passphrase.looksLikeDiceware && passphrase.wordCount >= 4)) {
    return 'Средний';
  }

  if (entropyBits < 90) {
    return 'Сильный';
  }

  return 'Отличный';
}

function detectLayoutWord(password) {
  const lower = password.toLowerCase();
  const toRu = mapLayout(lower, LAYOUT_MAPPINGS.enToRu);
  const toEn = mapLayout(lower, LAYOUT_MAPPINGS.ruToEn);

  for (const word of [...RUSSIAN_COMMON, ...RUSSIAN_MONTHS]) {
    if (toRu.includes(word)) {
      return { word, layout: 'EN→RU' };
    }
  }

  for (const word of [...LATIN_COMMON, ...NAME_FRAGMENTS]) {
    if (toEn.includes(word)) {
      return { word, layout: 'RU→EN' };
    }
  }

  return null;
}

function normaliseLeet(input) {
  return input
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

function hasSequentialSubstring(source, target, length) {
  if (!source || !target) return false;
  for (let i = 0; i <= target.length - length; i += 1) {
    const slice = target.slice(i, i + length);
    if (source.includes(slice)) {
      return true;
    }
  }
  return false;
}

function mapLayout(input, mapping) {
  return [...input]
    .map((char) => mapping[char] ?? char)
    .join('');
}

function buildDetectorResult(label, findings) {
  return {
    label,
    flagged: findings.length > 0,
    details: dedupe(findings)
  };
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

function formatNumber(value) {
  if (!Number.isFinite(value)) return '∞';
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)} млрд`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} млн`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} тыс.`;
  }
  return value.toLocaleString('ru-RU');
}

function normalizePassword(input) {
  if (typeof input === 'string') return input;
  if (input === null || input === undefined) return '';
  return String(input);
}
