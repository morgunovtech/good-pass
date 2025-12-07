import { analyzePassword, HASH_PROFILES } from './passwordAnalyzer.js';
import { dicewareWords, DICEWARE_WORD_COUNT } from './dicewareWords.js';

const translations = {
  ru: {
    title: 'Проверка пароля без лишних слов',
    subtitle: 'Введите пароль, увидьте запас прочности и узнайте, что можно усилить.',
    themeLabel: 'Тема',
    themeAuto: 'Авто',
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    themeContrast: 'Высокий контраст',
    analysisTag: 'Проверка',
    analysisTitle: 'Проверьте свой пароль',
    analysisHint: 'Один ввод — и вы увидите краткую оценку, запас прочности и понятные подсказки.',
    passwordLabel: 'Ваш пароль',
    passwordPlaceholder: 'Например, Река_Трава!94',
    show: 'Показать',
    hide: 'Скрыть',
    check: 'Проверить',
    scoreLabel: 'Оценка',
    strengthNote: 'Введите пароль, чтобы начать.',
    entropyLabel: 'Запас прочности',
    timeLabel: 'Примерное время перебора',
    goodTitle: 'Что уже хорошо',
    todoTitle: 'Что усилить',
    patternsTitle: 'Распознанные шаблоны',
    attackModel: 'Модель атакующего',
    attackOnline: 'Онлайн: медленно, с блокировками',
    attackOffline: 'Оффлайн: быстро, на мощном железе',
    hashProfile: 'Какой хэш',
    detectorPersonal: 'Персональные данные',
    detectorHomoglyphs: 'Похожие символы',
    detectorLayout: 'Раскладка',
    detectorWalk: 'Дорожки клавиатуры',
    guessFormulaLabel: 'Как мы считаем время',
    hibpButton: 'Проверить утечки',
    hibpPrivacy: 'Как работает k-анонимность',
    generatorTag: 'Создание',
    generatorTitle: 'Сгенерируйте надёжный пароль',
    generatorHint: 'Нажмите кнопку, скопируйте, сохраните в менеджере паролей.',
    passwordGen: 'Генератор пароля',
    passphraseGen: 'Diceware-пасфраза',
    length: 'Длина',
    includeUpper: 'Заглавные буквы',
    includeDigits: 'Цифры',
    includeSymbols: 'Символы',
    generate: 'Сгенерировать',
    copy: 'Скопировать',
    wordCount: 'Число слов',
    titlecase: 'Каждое слово с заглавной',
    delimiter: 'Разделитель',
    privacyTitle: 'Почему запрос безопасен',
    privacyText1:
      'Мы используем k-анонимность: отправляются только первые 5 символов SHA-1 хэша. Пароль остаётся у вас.',
    privacyText2: 'Have I Been Pwned возвращает только статистику по совпадениям.',
    close: 'Закрыть',
    tempMailTag: 'Временная почта',
    tempMailTitle: 'Получите временный адрес',
    tempMailDescription:
      'Временная почта помогает регистрироваться без основного e-mail. Адрес живёт 10 минут и потом удаляется.',
    tempMailGenerate: 'Создать временный адрес',
    tempMailInfo:
      'Доступ привязан к этой вкладке и защищён токеном. После истечения времени письма будут недоступны.',
    tempMailAddress: 'Ваш временный адрес',
    tempMailExpiresIn: 'Осталось',
    tempMailRenew: 'Создать новый адрес',
    tempMailInbox: 'Письма',
    tempMailRefresh: 'Обновить',
    tempMailEmpty: 'Пока писем нет.',
    tempMailMessageHeading: 'Содержимое письма',
    tempMailSelectPrompt: 'Выберите письмо, чтобы прочитать.',
    tempMailExpired: 'Срок действия истёк. Создайте новый адрес, чтобы продолжить.',
    tempMailError: 'Не удалось получить письма. Попробуйте позже.',
    tempMailCreateError: 'Не вышло создать ящик. Проверьте соединение и повторите попытку.',
    tempMailCopied: 'Адрес скопирован',
    tempMailLoading: 'Загружаем письма…',
    tempMailLimit: 'Достигнут лимит активных ящиков. Попробуйте позже.',
    tempMailRateLimited: 'Слишком частые запросы. Повторите через минуту.',
    tempMailNotConfigured:
      'Временная почта сейчас недоступна. Попробуйте позже или укажите данные провайдера во внешних переменных, если используете свой API.'
  },
  en: {
    title: 'Plain password check',
    subtitle: 'Type a password, see its strength and how to improve it.',
    themeLabel: 'Theme',
    themeAuto: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeContrast: 'High contrast',
    analysisTag: 'Check',
    analysisTitle: 'Check your password',
    analysisHint: 'One input to see strength, crack time, and human-friendly tips.',
    passwordLabel: 'Your password',
    passwordPlaceholder: 'For example: River_Grass!94',
    show: 'Show',
    hide: 'Hide',
    check: 'Check',
    scoreLabel: 'Result',
    strengthNote: 'Start by typing a password.',
    entropyLabel: 'Strength reserve',
    timeLabel: 'Estimated crack time',
    goodTitle: 'Already good',
    todoTitle: 'Could be better',
    patternsTitle: 'Detected patterns',
    attackModel: 'Attacker model',
    attackOnline: 'Online: slow, limited',
    attackOffline: 'Offline: fast hardware',
    hashProfile: 'Hashing',
    detectorPersonal: 'Personal data',
    detectorHomoglyphs: 'Lookalike letters',
    detectorLayout: 'Keyboard layout',
    detectorWalk: 'Keyboard walk',
    guessFormulaLabel: 'How we estimate time',
    hibpButton: 'Check leaks',
    hibpPrivacy: 'About k-anonymity',
    generatorTag: 'Create',
    generatorTitle: 'Generate a strong password',
    generatorHint: 'Generate, copy, and keep it in your password manager.',
    passwordGen: 'Password generator',
    passphraseGen: 'Diceware passphrase',
    length: 'Length',
    includeUpper: 'Uppercase letters',
    includeDigits: 'Digits',
    includeSymbols: 'Symbols',
    generate: 'Generate',
    copy: 'Copy',
    wordCount: 'Number of words',
    titlecase: 'Capitalize each word',
    delimiter: 'Delimiter',
    privacyTitle: 'Why the lookup is safe',
    privacyText1: 'We only send the first 5 chars of the SHA-1 hash. The password stays local.',
    privacyText2: 'Have I Been Pwned returns only hit counts.',
    close: 'Close',
    tempMailTag: 'Temp mail',
    tempMailTitle: 'Get a temporary address',
    tempMailDescription: 'Use disposable mail for sign-ups. Each inbox lives for 10 minutes, then expires.',
    tempMailGenerate: 'Create temp address',
    tempMailInfo:
      'Access is tied to this tab via a unique token. After 10 minutes the inbox and messages are removed.',
    tempMailAddress: 'Your temporary address',
    tempMailExpiresIn: 'Time left',
    tempMailRenew: 'Create new address',
    tempMailInbox: 'Inbox',
    tempMailRefresh: 'Refresh',
    tempMailEmpty: 'No messages yet.',
    tempMailMessageHeading: 'Message content',
    tempMailSelectPrompt: 'Pick a message to read.',
    tempMailExpired: 'This inbox expired. Create a new address to continue.',
    tempMailError: 'Could not load messages. Please try again.',
    tempMailCreateError: 'Could not create an inbox. Check your connection and retry.',
    tempMailCopied: 'Address copied',
    tempMailLoading: 'Loading messages…',
    tempMailLimit: 'Active inbox limit reached. Please try again later.',
    tempMailRateLimited: 'Too many requests. Please retry in a minute.',
    tempMailNotConfigured:
      'Temp mail is temporarily unavailable. Try later or set provider env vars if you use a custom API.'
  },
  uz: {
    title: 'Parolni tekshirish',
    subtitle: 'Parolni kiriting va natijani ko‘ring. (TODO: uz)',
    themeLabel: 'Mavzu',
    themeAuto: 'Avto',
    themeLight: 'Yorug‘',
    themeDark: 'Qorong‘u',
    themeContrast: 'Kontrast',
    analysisTag: 'Tekshiruv',
    analysisTitle: 'Parolni tekshiring',
    analysisHint: 'Natija va maslahatlar shu sahifada. (TODO: uz)',
    passwordLabel: 'Parolingiz',
    passwordPlaceholder: 'Masalan: Daryo_Gazon!94',
    show: 'Ko‘rsatish',
    hide: 'Yashirish',
    check: 'Tekshirish',
    scoreLabel: 'Baholash',
    strengthNote: 'Boshlash uchun parol kiriting.',
    entropyLabel: 'Zaxira',
    timeLabel: 'Taxminiy vaqt',
    goodTitle: 'Yaxshi tomonlar',
    todoTitle: 'Yaxshilash',
    patternsTitle: 'Topilgan naqshlar',
    attackModel: 'Hujumchi modeli',
    attackOnline: 'Onlayn: sekin',
    attackOffline: 'Oflayn: tez',
    hashProfile: 'Xesh',
    detectorPersonal: 'Shaxsiy ma’lumot',
    detectorHomoglyphs: 'O‘xshash belgilar',
    detectorLayout: 'Tugma tartibi',
    detectorWalk: 'Klaviatura izi',
    guessFormulaLabel: 'Hisoblash',
    hibpButton: 'Ochilishni tekshirish',
    hibpPrivacy: 'K-anonimlik',
    generatorTag: 'Yaratish',
    generatorTitle: 'Ishonchli parol yarating',
    generatorHint: 'Generatsiya qiling va nusxa oling. (TODO: uz)',
    passwordGen: 'Parol generatori',
    passphraseGen: 'Diceware',
    length: 'Uzunlik',
    includeUpper: 'Katta harflar',
    includeDigits: 'Raqamlar',
    includeSymbols: 'Belgilar',
    generate: 'Yaratish',
    copy: 'Nusxa olish',
    wordCount: 'So‘zlar soni',
    titlecase: 'Har bir so‘z katta',
    delimiter: 'Ajratuvchi',
    privacyTitle: 'Nega xavfsiz',
    privacyText1: 'Faqat xeshning bir qismi yuboriladi. (TODO: uz)',
    privacyText2: 'Havola faqat statistika qaytaradi.',
    close: 'Yopish',
    tempMailTag: 'Vaqtinchalik pochta',
    tempMailTitle: 'Vaqtinchalik manzil oling',
    tempMailDescription: 'Ro‘yxatdan o‘tish uchun bir martalik pochta. Manzil 10 daqiqa ishlaydi. (TODO: uz)',
    tempMailGenerate: 'Manzil yaratish',
    tempMailInfo: 'Kirish ushbu oynaga bog‘langan va 10 daqiqadan so‘ng o‘chadi. (TODO: uz)',
    tempMailAddress: 'Vaqtinchalik manzil',
    tempMailExpiresIn: 'Qoldi',
    tempMailRenew: 'Yangi manzil yaratish',
    tempMailInbox: 'Xatlar',
    tempMailRefresh: 'Yangilash',
    tempMailEmpty: 'Hozircha xatlar yo‘q.',
    tempMailMessageHeading: 'Xat mazmuni',
    tempMailSelectPrompt: 'O‘qish uchun xatni tanlang.',
    tempMailExpired: 'Muddati tugadi. Davom etish uchun yangisini yarating.',
    tempMailError: 'Xatlarni olish imkoni bo‘lmadi. Keyinroq urinib ko‘ring.',
    tempMailCreateError: 'Manzil yaratib bo‘lmadi. (TODO: uz)',
    tempMailCopied: 'Nusxa olindi',
    tempMailLoading: 'Yuklanmoqda…',
    tempMailLimit: 'Chegara oshib ketdi. Keyinroq urinib ko‘ring. (TODO: uz)',
    tempMailRateLimited: 'So‘rovlar juda ko‘p. Bir ozdan so‘ng urinib ko‘ring. (TODO: uz)',
    tempMailNotConfigured: 'Vaqtinchalik pochta sozlanmadi. TEMP_MAIL_API_BASE_URL ni qo‘shing. (TODO: uz)'
  }
};

const elements = {
  input: document.querySelector('#password-input'),
  toggle: document.querySelector('#toggle-visibility'),
  analyzeBtn: document.querySelector('#analyze-action'),
  meterFill: document.querySelector('.meter__fill'),
  strengthLabel: document.querySelector('#strength-label'),
  scoreEl: document.querySelector('#score'),
  timeEl: document.querySelector('#time'),
  entropyEl: document.querySelector('#entropy'),
  strengthsList: document.querySelector('#strengths'),
  weaknessesList: document.querySelector('#weaknesses'),
  patternsList: document.querySelector('#patterns'),
  guessRateNoteEl: document.querySelector('#guess-rate-note'),
  guessFormulaEl: document.querySelector('#guess-formula'),
  hashDescriptionEl: document.querySelector('#hash-description'),
  breachButton: document.querySelector('#breach-check'),
  breachStatusEl: document.querySelector('#breach-status'),
  breachResultEl: document.querySelector('#breach-result'),
  modal: document.querySelector('#privacy-modal'),
  attackRadios: document.querySelectorAll('input[name="attack-profile"]'),
  hashSelect: document.querySelector('#hash-profile'),
  generatorForm: document.querySelector('#generator-form'),
  lengthInput: document.querySelector('#generator-length'),
  lengthValue: document.querySelector('#generator-length-value'),
  uppercaseCheckbox: document.querySelector('#generator-uppercase'),
  digitsCheckbox: document.querySelector('#generator-digits'),
  symbolsCheckbox: document.querySelector('#generator-symbols'),
  generateButton: document.querySelector('#generate-password'),
  copyButton: document.querySelector('#copy-generated'),
  generatedPasswordEl: document.querySelector('#generated-password'),
  passphraseCountInput: document.querySelector('#passphrase-count'),
  passphraseCountValue: document.querySelector('#passphrase-count-value'),
  passphraseTitlecase: document.querySelector('#passphrase-titlecase'),
  passphraseDelimiter: document.querySelector('#passphrase-delimiter'),
  generatePassphraseBtn: document.querySelector('#generate-passphrase'),
  copyPassphraseBtn: document.querySelector('#copy-passphrase'),
  passphraseOutputEl: document.querySelector('#passphrase-output'),
  passphraseEntropyEl: document.querySelector('#passphrase-entropy'),
  themeSelect: document.querySelector('#theme-select'),
  langButtons: document.querySelectorAll('[data-lang]'),
  tempMailCreate: document.querySelector('#temp-mail-create'),
  tempMailMeta: document.querySelector('#temp-mail-meta'),
  tempMailAddress: document.querySelector('#temp-mail-address'),
  tempMailCopy: document.querySelector('#temp-mail-copy'),
  tempMailCountdown: document.querySelector('#temp-mail-countdown'),
  tempMailRenew: document.querySelector('#temp-mail-renew'),
  tempMailView: document.querySelector('#temp-mail-view'),
  tempMailList: document.querySelector('#temp-mail-list'),
  tempMailEmpty: document.querySelector('#temp-mail-empty'),
  tempMailError: document.querySelector('#temp-mail-error'),
  tempMailDetail: document.querySelector('#temp-mail-detail'),
  tempMailRefresh: document.querySelector('#temp-mail-refresh')
};

const detectorItems = new Map();
for (const item of document.querySelectorAll('.detector')) {
  const key = item.getAttribute('data-detector');
  if (!key) continue;
  detectorItems.set(key, {
    element: item,
    status: item.querySelector('.detector__status'),
    details: item.querySelector('.detector__details')
  });
}

const state = {
  attackProfile: 'offline',
  hashProfile: 'argon2id',
  breachController: null,
  language: loadLanguage(),
  theme: loadTheme(),
  tempMail: {
    mailboxId: null,
    address: null,
    accessToken: null,
    expiresAt: null,
    countdownTimer: null,
    pollTimer: null,
    messages: [],
    selectedMessage: null,
    configured: true
  }
};

function loadLanguage() {
  return localStorage.getItem('gp-lang') || 'ru';
}

function saveLanguage(lang) {
  localStorage.setItem('gp-lang', lang);
}

function loadTheme() {
  return localStorage.getItem('gp-theme') || 'auto';
}

function saveTheme(theme) {
  localStorage.setItem('gp-theme', theme);
}

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'auto') {
    html.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
    return;
  }
  document.body.setAttribute('data-theme', theme);
}

function translatePage(lang) {
  const dict = translations[lang] || translations.ru;
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (key && dict[key]) {
      node.textContent = dict[key];
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (key && dict[key]) {
      node.setAttribute('placeholder', dict[key]);
    }
  });

  elements.langButtons.forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.lang === lang ? 'true' : 'false');
  });

  if (elements.toggle) {
    elements.toggle.querySelector('span').textContent = elements.input?.type === 'password' ? dict.show : dict.hide;
  }

  renderTempMailState();
  updateTempMailCountdown();

  return dict;
}

function init() {
  if (!elements.input) return;

  applyTheme(state.theme);
  elements.themeSelect.value = state.theme;
  translatePage(state.language);

  elements.langButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const lang = button.dataset.lang;
      state.language = lang;
      saveLanguage(lang);
      translatePage(lang);
      handleAnalyze();
    });
  });

  elements.themeSelect?.addEventListener('change', () => {
    const theme = elements.themeSelect.value;
    state.theme = theme;
    saveTheme(theme);
    applyTheme(theme);
  });

  resetView();

  elements.attackRadios.forEach((radio) => {
    if (radio.checked) {
      state.attackProfile = radio.value;
    }
    radio.addEventListener('change', () => {
      state.attackProfile = radio.value;
      handleAnalyze();
    });
  });

  if (elements.hashSelect) {
    if (elements.hashSelect.value) {
      state.hashProfile = elements.hashSelect.value;
      updateHashDescription(elements.hashSelect.value);
    }
    elements.hashSelect.addEventListener('change', () => {
      state.hashProfile = elements.hashSelect.value;
      updateHashDescription(state.hashProfile);
      handleAnalyze();
    });
  }

  elements.input.addEventListener('input', handleAnalyze);
  elements.input.addEventListener('paste', handleAnalyze);
  elements.analyzeBtn?.addEventListener('click', handleAnalyze);

  elements.toggle?.addEventListener('click', () => {
    const dict = translations[state.language] || translations.ru;
    const isHidden = elements.input.type === 'password';
    elements.input.type = isHidden ? 'text' : 'password';
    elements.toggle.querySelector('span').textContent = isHidden ? dict.hide : dict.show;
    elements.toggle.setAttribute('aria-pressed', String(isHidden));
    elements.toggle.setAttribute('aria-label', isHidden ? dict.hide : dict.show);
    elements.input.focus();
  });

  setupGenerator();
  setupPassphraseGenerator();
  setupBreachCheck();
  setupModal();
  setupTempMail();
}

function handleAnalyze() {
  const value = elements.input.value ?? '';

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
  elements.meterFill.dataset.strength = String(level);

  const dict = translations[state.language] || translations.ru;
  elements.strengthLabel.textContent = password
    ? `${dict.scoreLabel}: ${result.scoreLabel}`
    : dict.strengthNote;

  elements.scoreEl.textContent = result.scoreLabel ?? '—';
  elements.timeEl.textContent = result.estimatedTime ?? '—';
  elements.entropyEl.textContent = result.entropyBits ? `${result.entropyBits} бит` : '—';
  updateTimeTooltip(result);
  updateGuessContext(result);
  updatePassphraseStats(result.passphrase);

  renderList(elements.strengthsList, result.strengths, dict.goodTitle);
  renderList(elements.weaknessesList, result.weaknesses, dict.todoTitle);
  renderList(elements.patternsList, result.patternMatches, dict.patternsTitle);
  renderDetectors(result.detectors);
}

function resetView() {
  elements.meterFill.dataset.strength = '0';
  const dict = translations[state.language] || translations.ru;
  elements.strengthLabel.textContent = dict.strengthNote;
  elements.scoreEl.textContent = '—';
  elements.timeEl.textContent = '—';
  elements.timeEl.removeAttribute('title');
  elements.entropyEl.textContent = '—';
  elements.guessRateNoteEl.textContent = '—';
  elements.guessFormulaEl.textContent = 'Время рассчитывается как 2^энтропии / скорость подбора.';
  if (elements.breachStatusEl) elements.breachStatusEl.textContent = '';
  if (elements.breachResultEl) elements.breachResultEl.textContent = '';

  renderList(elements.strengthsList, null, dict.goodTitle);
  renderList(elements.weaknessesList, null, dict.todoTitle);
  renderList(elements.patternsList, null, dict.patternsTitle);
  renderDetectors();

  if (elements.toggle) {
    elements.toggle.querySelector('span').textContent = dict.show;
    elements.toggle.setAttribute('aria-pressed', 'false');
    elements.toggle.setAttribute('aria-label', dict.show);
    if (elements.input.type !== 'password') {
      elements.input.type = 'password';
    }
  }
}

function renderList(container, items, emptyLabel) {
  if (!container) return;
  container.innerHTML = '';

  if (!items || items.length === 0) {
    const li = document.createElement('li');
    li.textContent = `${emptyLabel}: пока нет данных.`;
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

function renderDetectors(detectors = {}) {
  for (const [key, refs] of detectorItems.entries()) {
    const detector = detectors[key];
    const statusEl = refs.status;
    const detailsEl = refs.details;

    if (!detector) {
      statusEl.textContent = '—';
      detailsEl.textContent = '';
      refs.element.dataset.state = 'idle';
      continue;
    }

    refs.element.dataset.state = detector.flagged ? 'alert' : 'ok';
    statusEl.textContent = detector.flagged ? 'Нужно внимание' : 'Чисто';
    detailsEl.textContent = detector.flagged ? detector.details.join(' ') : 'Подозрительных признаков не нашли.';
  }
}

function updateTimeTooltip(result) {
  if (typeof result.estimatedSeconds !== 'number' || Number.isNaN(result.estimatedSeconds)) {
    elements.timeEl.removeAttribute('title');
    return;
  }

  if (!Number.isFinite(result.estimatedSeconds) || result.estimatedSeconds > 1e18) {
    elements.timeEl.title = 'Практически не поддаётся перебору.';
    return;
  }

  if (result.estimatedSeconds < 1) {
    elements.timeEl.title = 'Меньше секунды — добавьте длину и разнообразие.';
    return;
  }

  elements.timeEl.title = `Ориентировочно ${result.estimatedSeconds.toLocaleString('ru-RU')} секунд.`;
}

function updateGuessContext(result) {
  if (!elements.guessRateNoteEl || !elements.guessFormulaEl) return;

  const rate = formatNumber(result.guessRate);
  elements.guessRateNoteEl.textContent = `≈ ${rate} попыток/с (${result.attack.label} · ${result.hash.label})`;
  elements.guessFormulaEl.textContent = result.guessFormula;
}

function updatePassphraseStats(passphrase) {
  if (!passphrase || !elements.passphraseEntropyEl) {
    return;
  }

  if (passphrase.looksLikeDiceware && passphrase.wordCount >= 2) {
    elements.passphraseEntropyEl.textContent = `${passphrase.wordCount} слов · ~${passphrase.totalEntropy} бит`;
  } else if (passphrase.wordCount >= 2) {
    elements.passphraseEntropyEl.textContent = `${passphrase.wordCount} слов`;
  } else {
    elements.passphraseEntropyEl.textContent = '—';
  }
}

function mapScoreToLevel(score) {
  switch (score) {
    case 'Очень слабый':
    case 'Слабый':
      return 1;
    case 'Средний':
      return 2;
    case 'Сильный':
      return 3;
    case 'Отличный':
      return 4;
    default:
      return 0;
  }
}

function setupGenerator() {
  if (!elements.generatorForm || !elements.generatedPasswordEl) {
    return;
  }

  updateLengthOutput();

  elements.lengthInput?.addEventListener('input', updateLengthOutput);

  elements.generateButton?.addEventListener('click', () => {
    const password = generatePassword();
    if (!password) return;

    if (elements.copyButton) {
      elements.copyButton.textContent = translations[state.language]?.copy ?? 'Copy';
    }

    elements.input.value = password;
    elements.input.dispatchEvent(new Event('input', { bubbles: true }));
    showGeneratedPassword(password);
  });

  elements.copyButton?.addEventListener('click', async () => {
    const text = elements.generatedPasswordEl?.dataset.password;
    if (!text) return;

    await copyToClipboard(text, elements.copyButton);
  });
}

function setupPassphraseGenerator() {
  if (!elements.passphraseOutputEl) return;

  updatePassphraseCount();
  if (elements.passphraseEntropyEl) {
    elements.passphraseEntropyEl.textContent = '—';
  }

  elements.passphraseCountInput?.addEventListener('input', updatePassphraseCount);

  elements.generatePassphraseBtn?.addEventListener('click', () => {
    const phrase = generatePassphrase();
    if (!phrase) return;
    elements.passphraseOutputEl.textContent = phrase.value;
    elements.passphraseOutputEl.dataset.empty = 'false';
    elements.passphraseOutputEl.dataset.passphrase = phrase.value;
    elements.passphraseEntropyEl.textContent = `≈ ${phrase.entropy.toFixed(2)} бит энтропии`;

    if (elements.copyPassphraseBtn) {
      elements.copyPassphraseBtn.textContent = translations[state.language]?.copy ?? 'Copy';
    }

    elements.input.value = phrase.value;
    elements.input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  elements.copyPassphraseBtn?.addEventListener('click', async () => {
    const text = elements.passphraseOutputEl?.dataset.passphrase;
    if (!text) return;
    await copyToClipboard(text, elements.copyPassphraseBtn);
  });
}

function setupBreachCheck() {
  if (!elements.breachButton) return;

  elements.breachButton.addEventListener('click', async () => {
    const password = elements.input.value ?? '';
    if (!password.trim()) {
      elements.breachStatusEl.textContent = 'Сначала введите пароль выше.';
      elements.breachResultEl.textContent = '';
      return;
    }

    try {
      elements.breachButton.disabled = true;
      elements.breachStatusEl.textContent = 'Проверяем в HIBP…';
      elements.breachResultEl.textContent = '';

      if (state.breachController) {
        state.breachController.abort();
      }

      state.breachController = new AbortController();
      const exposures = await queryPwned(password, state.breachController.signal);

      if (exposures > 0) {
        elements.breachResultEl.textContent = `Пароль найден в утечках ${exposures.toLocaleString('ru-RU')} раз. Замените его.`;
      } else {
        elements.breachResultEl.textContent = 'Не нашли совпадений в открытых утечках.';
      }
      elements.breachStatusEl.textContent = 'Готово';
    } catch (error) {
      if (error?.name === 'AbortError') {
        elements.breachStatusEl.textContent = 'Проверка отменена.';
      } else {
        elements.breachStatusEl.textContent = 'Не удалось проверить — попробуйте позже.';
      }
    } finally {
      elements.breachButton.disabled = false;
      state.breachController = null;
    }
  });
}

function setupModal() {
  if (!elements.modal) return;

  const openers = document.querySelectorAll('[data-open-modal="privacy-modal"]');
  const closers = elements.modal.querySelectorAll('[data-close-modal]');

  openers.forEach((button) => {
    button.addEventListener('click', () => openModal());
  });

  closers.forEach((button) => {
    button.addEventListener('click', () => closeModal());
  });

  elements.modal.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.hasAttribute('data-close-modal')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.modal.hasAttribute('hidden')) {
      closeModal();
    }
  });
}

function openModal() {
  elements.modal.removeAttribute('hidden');
  const focusTarget = elements.modal.querySelector('[data-close-modal]');
  focusTarget?.focus();
  document.body.classList.add('modal-open');
}

function closeModal() {
  elements.modal.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
}

function updateLengthOutput() {
  if (!elements.lengthInput || !elements.lengthValue) return;
  elements.lengthValue.textContent = elements.lengthInput.value;
}

function updatePassphraseCount() {
  if (!elements.passphraseCountInput || !elements.passphraseCountValue) return;
  elements.passphraseCountValue.textContent = elements.passphraseCountInput.value;
}

function generatePassword() {
  const length = Number(elements.lengthInput?.value ?? 0);
  if (!Number.isFinite(length) || length < 4) {
    return '';
  }

  const pools = [];
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  pools.push(lowercase);

  if (elements.uppercaseCheckbox?.checked) {
    pools.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  }

  if (elements.digitsCheckbox?.checked) {
    pools.push('0123456789');
  }

  if (elements.symbolsCheckbox?.checked) {
    pools.push("~!@#$%^&*()-_=+[]{}|;:'\",.<>/?`\\");
  }

  const allChars = pools.join('');
  if (!allChars) {
    return '';
  }

  const passwordChars = [];

  for (const pool of pools) {
    passwordChars.push(pickRandom(pool));
  }

  const remainingLength = Math.max(length - passwordChars.length, 0);
  for (let i = 0; i < remainingLength; i += 1) {
    passwordChars.push(pickRandom(allChars));
  }

  shuffleArray(passwordChars);

  return passwordChars.slice(0, length).join('');
}

function generatePassphrase() {
  const count = Number(elements.passphraseCountInput?.value ?? 0);
  if (!Number.isFinite(count) || count < 3) {
    return null;
  }

  const delimiter = elements.passphraseDelimiter?.value ?? ' ';
  const words = [];

  for (let i = 0; i < count; i += 1) {
    const word = pickRandom(dicewareWords);
    if (!word) continue;
    const formatted = elements.passphraseTitlecase?.checked ? capitalize(word) : word;
    words.push(formatted);
  }

  if (words.length === 0) {
    return null;
  }

  const value = words.join(delimiter);
  const entropy = Math.log2(DICEWARE_WORD_COUNT) * words.length;

  return { value, entropy };
}

function pickRandom(source) {
  if (!source || source.length === 0) return '';
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  const index = array[0] % source.length;
  return source.charAt ? source.charAt(index) : source[index];
}

function shuffleArray(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
}

async function copyToClipboard(text, button) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement('textarea');
      temp.value = text;
      temp.setAttribute('readonly', '');
      temp.style.position = 'absolute';
      temp.style.left = '-9999px';
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }
    button.textContent = translations[state.language]?.copy ?? 'Скопировать';
    setTimeout(() => {
      button.textContent = translations[state.language]?.copy ?? 'Скопировать';
    }, 2000);
  } catch (error) {
    button.textContent = 'Ошибка копирования';
    setTimeout(() => {
      button.textContent = translations[state.language]?.copy ?? 'Скопировать';
    }, 2000);
  }
}

function setupTempMail() {
  if (!elements.tempMailCreate) return;

  elements.tempMailCreate.addEventListener('click', () => createTempMailbox());
  elements.tempMailRefresh?.addEventListener('click', () => fetchTempMailMessages());
  elements.tempMailRenew?.addEventListener('click', () => createTempMailbox());
  elements.tempMailCopy?.addEventListener('click', () => {
    if (!state.tempMail.address) return;
    copyToClipboard(state.tempMail.address, elements.tempMailCopy).then(() => {
      const dict = translations[state.language] || translations.ru;
      elements.tempMailCopy.textContent = dict.tempMailCopied;
      setTimeout(() => {
        elements.tempMailCopy.textContent = dict.copy;
      }, 1800);
    });
  });

  renderTempMailState();
}

function handleTempMailNotConfigured(errorPayload) {
  const dict = translations[state.language] || translations.ru;
  state.tempMail.configured = false;
  state.tempMail.mailboxId = null;
  state.tempMail.address = null;
  state.tempMail.accessToken = null;
  state.tempMail.expiresAt = null;
  state.tempMail.messages = [];
  state.tempMail.selectedMessage = null;
  clearTempMailTimers();
  if (elements.tempMailCreate) {
    elements.tempMailCreate.disabled = true;
    elements.tempMailCreate.setAttribute('aria-disabled', 'true');
  }
  if (elements.tempMailMeta) elements.tempMailMeta.hidden = true;
  if (elements.tempMailView) elements.tempMailView.hidden = true;
  if (elements.tempMailRenew) elements.tempMailRenew.hidden = true;
  if (elements.tempMailCountdown) elements.tempMailCountdown.textContent = '00:00';
  if (elements.tempMailDetail) {
    elements.tempMailDetail.innerHTML = `<p class="list__empty">${dict.tempMailNotConfigured}</p>`;
  }
  if (elements.tempMailError) {
    elements.tempMailError.textContent = formatNotConfiguredMessage(dict, errorPayload);
  }
}

function renderTempMailState() {
  if (!elements.tempMailEmpty || !elements.tempMailDetail) return;
  const dict = translations[state.language] || translations.ru;
  if (elements.tempMailEmpty) {
    elements.tempMailEmpty.textContent = state.tempMail.messages.length
      ? ''
      : dict.tempMailEmpty;
    elements.tempMailEmpty.hidden = state.tempMail.messages.length > 0;
  }
  if (elements.tempMailError && !elements.tempMailError.textContent) {
    elements.tempMailError.textContent = '';
  }
  if (elements.tempMailDetail && !state.tempMail.selectedMessage) {
    elements.tempMailDetail.innerHTML = `<p class="list__empty" data-i18n="tempMailSelectPrompt">${dict.tempMailSelectPrompt}</p>`;
  }
}

function clearTempMailTimers() {
  if (state.tempMail.countdownTimer) {
    clearInterval(state.tempMail.countdownTimer);
    state.tempMail.countdownTimer = null;
  }
  if (state.tempMail.pollTimer) {
    clearInterval(state.tempMail.pollTimer);
    state.tempMail.pollTimer = null;
  }
}

function enableTempMailCreate() {
  if (elements.tempMailCreate) {
    elements.tempMailCreate.disabled = false;
    elements.tempMailCreate.removeAttribute('aria-disabled');
  }
}

async function createTempMailbox() {
  const dict = translations[state.language] || translations.ru;
  clearTempMailTimers();
  elements.tempMailError.textContent = '';
  if (elements.tempMailDetail) {
    elements.tempMailDetail.innerHTML = `<p class="list__empty">${dict.tempMailLoading}</p>`;
  }

    try {
      const response = await fetch('/api/temp-mailbox', { method: 'POST' });
      if (!response.ok) {
        const errorPayload = await safeJson(response);
        if (errorPayload?.error === 'not_configured') {
          handleTempMailNotConfigured(errorPayload);
          return;
        }
        console.error('temp-mail create error', { status: response.status, error: errorPayload });
        elements.tempMailError.textContent = formatTempMailError(errorPayload, dict);
        return;
      }

    const payload = await response.json();
    state.tempMail.configured = true;
    enableTempMailCreate();
    state.tempMail.mailboxId = payload.mailboxId;
    state.tempMail.address = payload.address;
    state.tempMail.expiresAt = payload.expiresAt;
    state.tempMail.accessToken = payload.accessToken;
    state.tempMail.messages = [];
    state.tempMail.selectedMessage = null;

    elements.tempMailMeta.hidden = false;
    elements.tempMailView.hidden = false;
    elements.tempMailRenew.hidden = true;
    elements.tempMailAddress.textContent = payload.address;
    renderTempMailState();

    startTempMailCountdown();
    await fetchTempMailMessages();
    startTempMailPolling();
    } catch (error) {
      elements.tempMailError.textContent = dict.tempMailCreateError;
      console.error('temp-mail create network error', error);
    }
  }

function startTempMailPolling() {
  if (state.tempMail.pollTimer) {
    clearInterval(state.tempMail.pollTimer);
  }
  state.tempMail.pollTimer = setInterval(() => {
    fetchTempMailMessages();
  }, 12000);
}

async function fetchTempMailMessages() {
  if (!state.tempMail.mailboxId || !state.tempMail.accessToken) return;
  const dict = translations[state.language] || translations.ru;
  const params = new URLSearchParams({ accessToken: state.tempMail.accessToken });
  elements.tempMailError.textContent = '';

    try {
      const response = await fetch(`/api/temp-mailbox/${state.tempMail.mailboxId}/messages?${params.toString()}`);
      if (response.status === 410) {
        handleTempMailExpired();
        return;
      }
      if (!response.ok) {
        const errorPayload = await safeJson(response);
        if (errorPayload?.error === 'not_configured') {
          handleTempMailNotConfigured(errorPayload);
          return;
        }
        console.error('temp-mail list error', { status: response.status, error: errorPayload });
        elements.tempMailError.textContent = formatTempMailError(errorPayload, dict);
        return;
      }

    const payload = await response.json();
    state.tempMail.messages = payload.messages ?? [];
    renderTempMailMessages();
    } catch (error) {
      elements.tempMailError.textContent = dict.tempMailError;
      console.error('temp-mail list network error', error);
    }
  }

function renderTempMailMessages() {
  const dict = translations[state.language] || translations.ru;
  if (!elements.tempMailList) return;
  elements.tempMailList.innerHTML = '';

  const hasMessages = Array.isArray(state.tempMail.messages) && state.tempMail.messages.length > 0;
  elements.tempMailEmpty.hidden = hasMessages;

  if (!hasMessages) {
    if (elements.tempMailDetail) {
      elements.tempMailDetail.innerHTML = `<p class="list__empty">${dict.tempMailSelectPrompt}</p>`;
    }
    return;
  }

  for (const message of state.tempMail.messages) {
    const item = document.createElement('button');
    item.className = 'temp-mail__message';
    item.type = 'button';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <h4>${message.subject || '(без темы)'}</h4>
      <p>${message.from || ''}</p>
      <p>${formatReceivedAt(message.receivedAt)}</p>
    `;
    item.addEventListener('click', () => openTempMailMessage(message.id));
    elements.tempMailList.append(item);
  }
}

async function openTempMailMessage(messageId) {
  if (!messageId) return;
  const dict = translations[state.language] || translations.ru;
  const params = new URLSearchParams({ accessToken: state.tempMail.accessToken });

  elements.tempMailDetail.innerHTML = `<p class="list__empty">${dict.tempMailLoading}</p>`;

  try {
    const response = await fetch(
      `/api/temp-mailbox/${state.tempMail.mailboxId}/messages/${encodeURIComponent(messageId)}?${params.toString()}`
    );
    if (response.status === 410) {
      handleTempMailExpired();
      return;
    }
      if (!response.ok) {
        const errorPayload = await safeJson(response);
        if (errorPayload?.error === 'not_configured') {
          handleTempMailNotConfigured(errorPayload);
          return;
        }
        console.error('temp-mail read error', { status: response.status, error: errorPayload });
        elements.tempMailError.textContent = formatTempMailError(errorPayload, dict);
        return;
      }

    const payload = await response.json();
    state.tempMail.selectedMessage = payload;
    renderTempMailDetail(payload);
    } catch (error) {
      elements.tempMailError.textContent = dict.tempMailError;
      console.error('temp-mail read network error', error);
    }
  }

function renderTempMailDetail(message) {
  if (!elements.tempMailDetail) return;
  const dict = translations[state.language] || translations.ru;
  if (!message) {
    elements.tempMailDetail.innerHTML = `<p class="list__empty">${dict.tempMailSelectPrompt}</p>`;
    return;
  }

  elements.tempMailDetail.innerHTML = `
    <div>
      <h5>${message.subject || '(без темы)'}</h5>
      <p class="meta__note">${message.from || ''}</p>
      <p class="meta__note">${formatReceivedAt(message.receivedAt)}</p>
    </div>
    <div class="temp-mail__body">${message.htmlBodySanitized || escapeHtml(message.textBody)}</div>
  `;
}

function escapeHtml(text) {
  return text
    ?.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function startTempMailCountdown() {
  clearTempMailTimers();
  updateTempMailCountdown();
  state.tempMail.countdownTimer = setInterval(updateTempMailCountdown, 1000);
}

function updateTempMailCountdown() {
  if (!state.tempMail.expiresAt || !elements.tempMailCountdown) return;
  const dict = translations[state.language] || translations.ru;
  const remaining = Math.max(state.tempMail.expiresAt - Date.now(), 0);
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000)
    .toString()
    .padStart(2, '0');
  elements.tempMailCountdown.textContent = `${minutes}:${seconds}`;

  if (remaining <= 0) {
    handleTempMailExpired();
    elements.tempMailError.textContent = dict.tempMailExpired;
  }
}

function handleTempMailExpired() {
  clearTempMailTimers();
  const dict = translations[state.language] || translations.ru;
  if (elements.tempMailCountdown) {
    elements.tempMailCountdown.textContent = '00:00';
  }
  if (elements.tempMailRenew) {
    elements.tempMailRenew.hidden = false;
  }
  elements.tempMailError.textContent = dict.tempMailExpired;
}

function startTempMailCountdownIfNeeded() {
  if (state.tempMail.expiresAt) {
    startTempMailCountdown();
  }
}

function formatTempMailError(payload, dict) {
  if (payload?.error === 'not_configured') return formatNotConfiguredMessage(dict, payload);
  if (payload?.error === 'expired') return dict.tempMailExpired;
  if (payload?.error === 'too_many_mailboxes') return dict.tempMailLimit;
  if (payload?.error === 'rate_limited') return dict.tempMailRateLimited;
  return dict.tempMailError;
}

function formatNotConfiguredMessage(dict, payload) {
  if (payload?.missing?.length) {
    return `${dict.tempMailNotConfigured} (${payload.missing.join(', ')})`;
  }
  return dict.tempMailNotConfigured;
}

function formatReceivedAt(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function queryPwned(password, signal) {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-1', encoder.encode(password));
  const hash = bufferToHex(digest).toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true' },
    signal
  });

  if (!response.ok) {
    throw new Error('HIBP request failed');
  }

  const text = await response.text();
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    const [hashSuffix, count] = line.split(':');
    if (!hashSuffix || !count) continue;
    if (hashSuffix.trim().toUpperCase() === suffix) {
      return Number.parseInt(count, 10) || 0;
    }
  }

  return 0;
}

function bufferToHex(buffer) {
  const view = new DataView(buffer);
  const hex = [];
  for (let i = 0; i < view.byteLength; i += 1) {
    const value = view.getUint8(i).toString(16).padStart(2, '0');
    hex.push(value);
  }
  return hex.join('');
}

function showGeneratedPassword(password) {
  if (!elements.generatedPasswordEl) return;
  elements.generatedPasswordEl.textContent = password;
  elements.generatedPasswordEl.dataset.password = password;
  elements.generatedPasswordEl.dataset.empty = 'false';
}

function updateHashDescription(hashId) {
  const profile = HASH_PROFILES.find((item) => item.id === hashId);
  elements.hashDescriptionEl.textContent = profile?.description ?? '';
}

function capitalize(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
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

init();
