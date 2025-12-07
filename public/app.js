import { analyzePassword, HASH_PROFILES } from './passwordAnalyzer.js';
import { dicewareWords, DICEWARE_WORD_COUNT } from './dicewareWords.js';

const els = {
  password: document.querySelector('#password-input'),
  toggle: document.querySelector('#toggle-visibility'),
  analyzeForm: document.querySelector('#analyzer-form'),
  meterFill: document.querySelector('.meter__fill'),
  strengthLabel: document.querySelector('#strength-label'),
  score: document.querySelector('#score'),
  time: document.querySelector('#time'),
  entropy: document.querySelector('#entropy'),
  wordEntropy: document.querySelector('#word-entropy'),
  wordEntropyNote: document.querySelector('#word-entropy-note'),
  strengths: document.querySelector('#strengths'),
  weaknesses: document.querySelector('#weaknesses'),
  patterns: document.querySelector('#patterns'),
  breachStatus: document.querySelector('#breach-status'),
  breachResult: document.querySelector('#breach-result'),
  breachBtn: document.querySelector('#breach-check'),
  modal: document.querySelector('#privacy-modal'),
  closeModal: document.querySelector('#close-modal'),
  attackOptions: document.querySelectorAll('input[name="attack-profile"]'),
  hashSelect: document.querySelector('#hash-profile'),
  guessFormula: document.querySelector('#guess-formula'),
  generatorForm: document.querySelector('#generator-form'),
  genLength: document.querySelector('#generator-length'),
  genLengthValue: document.querySelector('#generator-length-value'),
  genUpper: document.querySelector('#generator-uppercase'),
  genDigits: document.querySelector('#generator-digits'),
  genSymbols: document.querySelector('#generator-symbols'),
  genBtn: document.querySelector('#generate-password'),
  genCopy: document.querySelector('#copy-generated'),
  genOutput: document.querySelector('#generated-password'),
  passphraseForm: document.querySelector('#passphrase-form'),
  passCount: document.querySelector('#passphrase-count'),
  passCountValue: document.querySelector('#passphrase-count-value'),
  passTitle: document.querySelector('#passphrase-titlecase'),
  passDelimiter: document.querySelector('#passphrase-delimiter'),
  passBtn: document.querySelector('#generate-passphrase'),
  passCopy: document.querySelector('#copy-passphrase'),
  passOutput: document.querySelector('#passphrase-output'),
  passEntropy: document.querySelector('#passphrase-entropy'),
  languageButtons: document.querySelectorAll('[data-lang]'),
  themeSelect: document.querySelector('#theme-select'),
  analyzerHint: document.querySelector('[data-i18n="analyzerHint"]')
};

const translations = {
  ru: {
    title: 'Parole',
    subtitle: 'Быстрая проверка надёжности пароля и генератор надёжных фраз',
    analyzerLabel: 'Проверка пароля',
    analyzerTitle: 'Оцените свой пароль',
    analyzerHint:
      'Введите пароль — мы покажем, насколько его сложно подобрать даже при миллиардах попыток в секунду.',
    passwordLabel: 'Пароль или фраза',
    toggleShow: 'Показать',
    toggleHide: 'Скрыть',
    check: 'Проверить',
    attackLabel: 'Модель атакующего',
    hashLabel: 'Хэширование',
    breachCheck: 'Проверить утечки',
    scoreTitle: 'Оценка',
    scoreHint: 'Введите пароль, чтобы начать проверку.',
    entropyLabel: 'Запас прочности',
    entropyHelp: 'Это количество бит безопасности: чем выше число, тем сложнее автоматический подбор.',
    timeLabel: 'Примерное время перебора',
    passphraseLabel: 'Похоже на пассфразу',
    passphraseNote: 'Определяем автоматически при вводе слов.',
    strengths: 'Что уже хорошо',
    weaknesses: 'Что можно усилить',
    patterns: 'Шаблоны',
    generatorLabel: 'Генератор',
    generatorTitle: 'Создайте надёжный пароль',
    generatorHint: 'Выберите длину и набор символов — получаете случайный пароль.',
    lengthLabel: 'Длина',
    useUpper: 'Заглавные',
    useDigits: 'Цифры',
    useSymbols: 'Символы',
    generate: 'Сгенерировать',
    copy: 'Скопировать',
    passphraseGenLabel: 'Пассфраза Diceware',
    passphraseTitle: 'Запомнить проще, подобрать сложнее',
    passphraseHint: 'Больше слов — выше запас прочности. Каждое слово выбирается случайно.',
    wordCount: 'Количество слов',
    titleCase: 'С заглавных букв',
    delimiter: 'Разделитель',
    privacyTitle: 'Проверка утечек приватно',
    privacyBody:
      'Мы отправляем только первые 5 символов SHA-1 в Have I Been Pwned. Полный пароль остаётся в вашем браузере.',
    close: 'Закрыть',
    theme: 'Тема',
    themeAuto: 'Авто',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeHigh: 'Высокий контраст'
  },
  en: {
    title: 'Parole',
    subtitle: 'Quick password check and secure generator',
    analyzerLabel: 'Check password',
    analyzerTitle: 'Test your password',
    analyzerHint: 'Type a password to see how resistant it is to fast guessing attacks.',
    passwordLabel: 'Password or phrase',
    toggleShow: 'Show',
    toggleHide: 'Hide',
    check: 'Check',
    attackLabel: 'Attacker model',
    hashLabel: 'Hashing',
    breachCheck: 'Check breaches',
    scoreTitle: 'Score',
    scoreHint: 'Enter a password to begin.',
    entropyLabel: 'Strength reserve',
    entropyHelp: 'Number of security bits: the higher, the harder to brute-force.',
    timeLabel: 'Approximate cracking time',
    passphraseLabel: 'Looks like a passphrase',
    passphraseNote: 'Detected automatically when you type words.',
    strengths: 'What is good',
    weaknesses: 'What to improve',
    patterns: 'Patterns',
    generatorLabel: 'Generator',
    generatorTitle: 'Make a strong password',
    generatorHint: 'Pick length and character sets — get a random password.',
    lengthLabel: 'Length',
    useUpper: 'Uppercase',
    useDigits: 'Digits',
    useSymbols: 'Symbols',
    generate: 'Generate',
    copy: 'Copy',
    passphraseGenLabel: 'Diceware passphrase',
    passphraseTitle: 'Easier to remember, harder to crack',
    passphraseHint: 'More words mean higher strength. Each word is chosen at random.',
    wordCount: 'Word count',
    titleCase: 'Capitalize',
    delimiter: 'Separator',
    privacyTitle: 'Private breach check',
    privacyBody: 'Only the first 5 characters of SHA-1 are sent to HIBP. The full password stays in your browser.',
    close: 'Close',
    theme: 'Theme',
    themeAuto: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeHigh: 'High contrast'
  },
  uz: {
    title: 'Parole',
    subtitle: 'TODO: uz',
    analyzerLabel: 'TODO: uz',
    analyzerTitle: 'TODO: uz',
    analyzerHint: 'TODO: uz',
    passwordLabel: 'TODO: uz',
    toggleShow: 'TODO: uz',
    toggleHide: 'TODO: uz',
    check: 'TODO: uz',
    attackLabel: 'TODO: uz',
    hashLabel: 'TODO: uz',
    breachCheck: 'TODO: uz',
    scoreTitle: 'TODO: uz',
    scoreHint: 'TODO: uz',
    entropyLabel: 'TODO: uz',
    entropyHelp: 'TODO: uz',
    timeLabel: 'TODO: uz',
    passphraseLabel: 'TODO: uz',
    passphraseNote: 'TODO: uz',
    strengths: 'TODO: uz',
    weaknesses: 'TODO: uz',
    patterns: 'TODO: uz',
    generatorLabel: 'TODO: uz',
    generatorTitle: 'TODO: uz',
    generatorHint: 'TODO: uz',
    lengthLabel: 'TODO: uz',
    useUpper: 'TODO: uz',
    useDigits: 'TODO: uz',
    useSymbols: 'TODO: uz',
    generate: 'TODO: uz',
    copy: 'TODO: uz',
    passphraseGenLabel: 'TODO: uz',
    passphraseTitle: 'TODO: uz',
    passphraseHint: 'TODO: uz',
    wordCount: 'TODO: uz',
    titleCase: 'TODO: uz',
    delimiter: 'TODO: uz',
    privacyTitle: 'TODO: uz',
    privacyBody: 'TODO: uz',
    close: 'TODO: uz',
    theme: 'TODO: uz',
    themeAuto: 'TODO: uz',
    themeLight: 'TODO: uz',
    themeDark: 'TODO: uz',
    themeHigh: 'TODO: uz'
  }
};

const state = {
  attackProfile: 'offline',
  hashProfile: 'argon2id',
  lang: 'ru',
  theme: 'auto'
};

init();

function init() {
  populateHashes();
  bindTheme();
  bindLanguage();
  bindAnalyzer();
  bindGenerator();
  bindPassphrase();
  bindBreach();
  applyTranslations();
  applyTheme();
  resetView();
}

function bindAnalyzer() {
  els.analyzeForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAnalyze();
  });

  els.password?.addEventListener('input', () => handleAnalyze());

  els.toggle?.addEventListener('click', () => {
    if (!els.password) return;
    const isHidden = els.password.type === 'password';
    els.password.type = isHidden ? 'text' : 'password';
    els.toggle.querySelector('span').textContent = isHidden
      ? translations[state.lang]?.toggleHide ?? 'Hide'
      : translations[state.lang]?.toggleShow ?? 'Show';
    els.toggle.setAttribute('aria-pressed', String(isHidden));
    els.password.focus();
  });

  els.attackOptions.forEach((radio) => {
    radio.addEventListener('change', () => {
      state.attackProfile = radio.value;
      handleAnalyze();
    });
  });

  els.hashSelect?.addEventListener('change', () => {
    state.hashProfile = els.hashSelect.value;
    handleAnalyze();
  });
}

function bindGenerator() {
  if (!els.generatorForm) return;
  els.genLength?.addEventListener('input', () => {
    els.genLengthValue.textContent = els.genLength.value;
  });
  els.genBtn?.addEventListener('click', () => {
    const password = generatePassword();
    els.genOutput.textContent = password;
    navigator.clipboard?.writeText(password).catch(() => {});
  });
  els.genCopy?.addEventListener('click', () => copyText(els.genOutput.textContent));
}

function bindPassphrase() {
  if (!els.passphraseForm) return;
  els.passCount?.addEventListener('input', () => {
    els.passCountValue.textContent = els.passCount.value;
  });
  els.passBtn?.addEventListener('click', () => {
    const phrase = generatePassphrase();
    els.passOutput.textContent = phrase.value;
    els.passEntropy.textContent = phrase.entropyLabel;
    navigator.clipboard?.writeText(phrase.value).catch(() => {});
  });
  els.passCopy?.addEventListener('click', () => copyText(els.passOutput.textContent));
}

function bindBreach() {
  if (!els.breachBtn) return;
  els.breachBtn.addEventListener('click', async () => {
    if (!els.password?.value) return;
    const value = els.password.value;
    els.breachStatus.textContent = 'Проверяем через Have I Been Pwned…';
    try {
      const { breached, count } = await checkPwned(value);
      els.breachStatus.textContent = breached
        ? 'Найдено совпадений в утечках'
        : 'В утечках не найдено';
      els.breachResult.textContent = breached
        ? `Пароль встречался ${count.toLocaleString('ru-RU')} раз`
        : 'Хороший знак, но пароль всё равно нельзя повторно использовать.';
    } catch (err) {
      console.error(err);
      els.breachStatus.textContent = 'Не удалось проверить. Проверьте сеть или попробуйте позже.';
    }
  });

  els.breachBtn.addEventListener('dblclick', () => {
    els.modal?.showModal();
  });
  els.closeModal?.addEventListener('click', () => els.modal?.close());
}

function bindLanguage() {
  const saved = localStorage.getItem('lang');
  if (saved && translations[saved]) {
    state.lang = saved;
  }
  els.languageButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === state.lang);
    btn.addEventListener('click', () => {
      state.lang = btn.dataset.lang;
      localStorage.setItem('lang', state.lang);
      els.languageButtons.forEach((b) => b.classList.toggle('active', b.dataset.lang === state.lang));
      applyTranslations();
    });
  });
}

function bindTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) state.theme = saved;
  if (els.themeSelect) {
    els.themeSelect.value = state.theme;
    els.themeSelect.addEventListener('change', () => {
      state.theme = els.themeSelect.value;
      localStorage.setItem('theme', state.theme);
      applyTheme();
    });
  }
}

function applyTranslations() {
  const dict = translations[state.lang] ?? translations.ru;
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (dict[key]) node.textContent = dict[key];
  });
  if (els.toggle) {
    els.toggle.querySelector('span').textContent =
      els.password?.type === 'password' ? dict.toggleShow : dict.toggleHide;
  }
}

function applyTheme() {
  const theme = state.theme;
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.dataset.theme = prefersDark ? 'dark' : 'light';
    return;
  }
  document.body.dataset.theme = theme;
}

function populateHashes() {
  if (!els.hashSelect) return;
  els.hashSelect.innerHTML = '';
  HASH_PROFILES.forEach((profile) => {
    const opt = document.createElement('option');
    opt.value = profile.id;
    opt.textContent = profile.label;
    if (profile.id === state.hashProfile) opt.selected = true;
    els.hashSelect.append(opt);
  });
}

function handleAnalyze() {
  const value = els.password?.value ?? '';
  if (!value.trim()) {
    resetView();
    return;
  }

  const result = analyzePassword(value, {
    attackProfile: state.attackProfile,
    hashProfile: state.hashProfile
  });
  applyResult(value, result);
}

function applyResult(password, result) {
  const level = mapScoreToLevel(result.scoreLabel);
  els.meterFill.dataset.strength = String(level);
  els.strengthLabel.textContent = password
    ? `Пароль оценён как: ${result.scoreLabel}`
    : translations[state.lang]?.scoreHint ?? 'Введите пароль.';
  els.score.textContent = result.scoreLabel ?? '—';
  els.time.textContent = result.estimatedTime ?? '—';
  els.entropy.textContent = result.entropyBits ? `${result.entropyBits} бит` : '—';
  updateGuessContext(result);
  updatePassphraseStats(result.passphrase);
  renderList(els.strengths, result.strengths, 'Введите пароль — сильные стороны появятся здесь.');
  renderList(els.weaknesses, result.weaknesses, 'Мы покажем, что усилить, как только появится пароль.');
  renderList(els.patterns, result.patternMatches, 'Мы отметим словари, последовательности и другие шаблоны.');
}

function updateGuessContext(result) {
  if (!els.guessFormula) return;
  els.guessFormula.textContent = result.guessFormula;
}

function updatePassphraseStats(passphrase) {
  els.wordEntropy.textContent = passphrase?.totalEntropy
    ? `${passphrase.totalEntropy} бит`
    : '—';
  els.wordEntropyNote.textContent = passphrase?.looksLikeDiceware
    ? `Слова: ${passphrase.wordCount}. Каждое слово добавляет ~${passphrase.entropyPerWord} бит.`
    : translations[state.lang]?.passphraseNote ?? '';
}

function renderList(container, items, emptyState) {
  if (!container) return;
  container.innerHTML = '';
  if (!items || items.length === 0) {
    const li = document.createElement('li');
    li.textContent = emptyState;
    li.className = 'list__empty';
    container.append(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    container.append(li);
  }
}

function resetView() {
  els.meterFill.dataset.strength = '0';
  els.strengthLabel.textContent = translations[state.lang]?.scoreHint ?? '';
  els.score.textContent = '—';
  els.time.textContent = '—';
  els.entropy.textContent = '—';
  els.wordEntropy.textContent = '—';
  els.wordEntropyNote.textContent = translations[state.lang]?.passphraseNote ?? '';
  renderList(els.strengths, null, 'Введите пароль — сильные стороны появятся здесь.');
  renderList(els.weaknesses, null, 'Мы покажем, что усилить, как только появится пароль.');
  renderList(els.patterns, null, 'Мы отметим словари, последовательности и другие шаблоны.');
  if (els.breachStatus) els.breachStatus.textContent = '';
  if (els.breachResult) els.breachResult.textContent = '';
  if (els.password && els.password.type !== 'password') {
    els.password.type = 'password';
    els.toggle?.setAttribute('aria-pressed', 'false');
    if (els.toggle) {
      els.toggle.querySelector('span').textContent = translations[state.lang]?.toggleShow ?? 'Show';
    }
  }
}

function mapScoreToLevel(label) {
  switch (label) {
    case 'Очень слабый':
    case 'Слабый':
      return 1;
    case 'Средний':
      return 2;
    case 'Хороший':
      return 3;
    case 'Отличный':
      return 4;
    default:
      return 0;
  }
}

function generatePassword() {
  const length = Number(els.genLength?.value ?? 16);
  let charset = 'abcdefghijklmnopqrstuvwxyz';
  if (els.genUpper?.checked) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (els.genDigits?.checked) charset += '0123456789';
  if (els.genSymbols?.checked) charset += '~!@#$%^&*()-_=+[]{}|;:\",.<>/?`\\';

  if (!charset.length) charset = 'abcdefghijklmnopqrstuvwxyz';

  let result = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    const index = array[i] % charset.length;
    result += charset[index];
  }
  return result;
}

function generatePassphrase() {
  const words = Number(els.passCount?.value ?? 4);
  const delimiter = els.passDelimiter?.value ?? '-';
  const titlecase = Boolean(els.passTitle?.checked);

  const array = new Uint32Array(words);
  crypto.getRandomValues(array);
  const parts = [];
  for (let i = 0; i < words; i++) {
    const index = array[i] % dicewareWords.length;
    const raw = dicewareWords[index];
    parts.push(titlecase ? capitalize(raw) : raw);
  }
  const value = parts.join(delimiter);
  const entropy = Math.round(words * Math.log2(DICEWARE_WORD_COUNT));
  return {
    value,
    entropy,
    entropyLabel: `Запас прочности: ~${entropy} бит`
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function copyText(value) {
  if (!value || value === '—') return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (err) {
    console.error('Clipboard copy failed', err);
  }
}

async function checkPwned(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  const text = await response.text();
  const lines = text.split('\n');
  for (const line of lines) {
    const [hash, count] = line.trim().split(':');
    if (hash === suffix) {
      return { breached: true, count: Number(count) };
    }
  }
  return { breached: false, count: 0 };
}
