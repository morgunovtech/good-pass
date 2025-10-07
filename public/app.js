import { analyzePassword, HASH_PROFILES } from './passwordAnalyzer.js';
import { dicewareWords, DICEWARE_WORD_COUNT } from './dicewareWords.js';

const input = document.querySelector('#password-input');
const toggle = document.querySelector('#toggle-visibility');
const meterFill = document.querySelector('.meter__fill');
const strengthLabel = document.querySelector('#strength-label');
const scoreEl = document.querySelector('#score');
const timeEl = document.querySelector('#time');
const entropyEl = document.querySelector('#entropy');
const wordEntropyEl = document.querySelector('#word-entropy');
const wordEntropyNoteEl = document.querySelector('#word-entropy-note');
const strengthsList = document.querySelector('#strengths');
const weaknessesList = document.querySelector('#weaknesses');
const patternsList = document.querySelector('#patterns');
const guessRateNoteEl = document.querySelector('#guess-rate-note');
const guessFormulaEl = document.querySelector('#guess-formula');
const hashDescriptionEl = document.querySelector('#hash-description');
const breachButton = document.querySelector('#breach-check');
const breachStatusEl = document.querySelector('#breach-status');
const breachResultEl = document.querySelector('#breach-result');
const modal = document.querySelector('#privacy-modal');

const attackRadios = document.querySelectorAll('input[name="attack-profile"]');
const hashSelect = document.querySelector('#hash-profile');

const generatorForm = document.querySelector('#generator-form');
const lengthInput = document.querySelector('#generator-length');
const lengthValue = document.querySelector('#generator-length-value');
const uppercaseCheckbox = document.querySelector('#generator-uppercase');
const digitsCheckbox = document.querySelector('#generator-digits');
const symbolsCheckbox = document.querySelector('#generator-symbols');
const generateButton = document.querySelector('#generate-password');
const copyButton = document.querySelector('#copy-generated');
const generatedPasswordEl = document.querySelector('#generated-password');

const passphraseCountInput = document.querySelector('#passphrase-count');
const passphraseCountValue = document.querySelector('#passphrase-count-value');
const passphraseTitlecase = document.querySelector('#passphrase-titlecase');
const passphraseDelimiter = document.querySelector('#passphrase-delimiter');
const generatePassphraseBtn = document.querySelector('#generate-passphrase');
const copyPassphraseBtn = document.querySelector('#copy-passphrase');
const passphraseOutputEl = document.querySelector('#passphrase-output');
const passphraseEntropyEl = document.querySelector('#passphrase-entropy');

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
  breachController: null
};

function init() {
  if (!input) return;

  resetView();

  attackRadios.forEach((radio) => {
    if (radio.checked) {
      state.attackProfile = radio.value;
    }
    radio.addEventListener('change', () => {
      state.attackProfile = radio.value;
      handleAnalyze();
    });
  });

  if (hashSelect) {
    if (hashSelect.value) {
      state.hashProfile = hashSelect.value;
      updateHashDescription(hashSelect.value);
    }
    hashSelect.addEventListener('change', () => {
      state.hashProfile = hashSelect.value;
      updateHashDescription(state.hashProfile);
      handleAnalyze();
    });
  }

  input.addEventListener('input', handleAnalyze);
  input.addEventListener('paste', handleAnalyze);

  toggle?.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    toggle.textContent = isHidden ? 'Скрыть' : 'Показать';
    toggle.setAttribute('aria-pressed', String(isHidden));
    toggle.setAttribute('aria-label', isHidden ? 'Скрыть пароль' : 'Показать пароль');
    input.focus();
  });

  setupGenerator();
  setupPassphraseGenerator();
  setupBreachCheck();
  setupModal();
}

function handleAnalyze() {
  const value = input.value ?? '';

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
  meterFill.dataset.strength = String(level);

  strengthLabel.textContent = password
    ? `Пароль оценён как: ${result.scoreLabel}`
    : 'Введите пароль, чтобы начать проверку.';

  scoreEl.textContent = result.scoreLabel ?? '—';
  timeEl.textContent = result.estimatedTime ?? '—';
  entropyEl.textContent = result.entropyBits ? `${result.entropyBits} бит` : '—';
  updateTimeTooltip(result);
  updateGuessContext(result);
  updatePassphraseStats(result.passphrase);

  renderList(strengthsList, result.strengths, 'Введите пароль — сильные стороны появятся здесь.');
  renderList(
    weaknessesList,
    result.weaknesses,
    'Мы покажем, что усилить, как только появится пароль.'
  );
  renderList(patternsList, result.patternMatches, 'Мы отметим словари, последовательности и другие шаблоны.');
  renderDetectors(result.detectors);
}

function resetView() {
  meterFill.dataset.strength = '0';
  strengthLabel.textContent = 'Введите пароль, чтобы начать проверку.';
  scoreEl.textContent = '—';
  timeEl.textContent = '—';
  timeEl.removeAttribute('title');
  entropyEl.textContent = '—';
  wordEntropyEl.textContent = '—';
  wordEntropyNoteEl.textContent = 'Определяем автоматически при вводе слов.';
  guessRateNoteEl.textContent = '—';
  guessFormulaEl.textContent = 'Время рассчитывается как 2^энтропии / скорость подбора.';
  if (breachStatusEl) breachStatusEl.textContent = '';
  if (breachResultEl) breachResultEl.textContent = '';

  renderList(strengthsList, null, 'Введите пароль — сильные стороны появятся здесь.');
  renderList(weaknessesList, null, 'Мы покажем, что усилить, как только появится пароль.');
  renderList(patternsList, null, 'Мы отметим словари, последовательности и другие шаблоны.');
  renderDetectors();

  if (toggle) {
    toggle.textContent = 'Показать';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Показать пароль');
    if (input.type !== 'password') {
      input.type = 'password';
    }
  }
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
    statusEl.textContent = detector.flagged ? 'Внимание' : 'Чисто';
    detailsEl.textContent = detector.flagged ? detector.details.join(' ') : 'Подозрительных признаков не нашли.';
  }
}

function updateTimeTooltip(result) {
  if (typeof result.estimatedSeconds !== 'number' || Number.isNaN(result.estimatedSeconds)) {
    timeEl.removeAttribute('title');
    return;
  }

  if (!Number.isFinite(result.estimatedSeconds) || result.estimatedSeconds > 1e18) {
    timeEl.title = 'Практически не поддаётся перебору.';
    return;
  }

  if (result.estimatedSeconds < 1) {
    timeEl.title = 'Меньше секунды — добавьте длину и разнообразие.';
    return;
  }

  timeEl.title = `Ориентировочно ${result.estimatedSeconds.toLocaleString('ru-RU')} секунд.`;
}

function updateGuessContext(result) {
  if (!guessRateNoteEl || !guessFormulaEl) return;

  const rate = formatNumber(result.guessRate);
  guessRateNoteEl.textContent = `≈ ${rate} попыток/с (${result.attack.label} · ${result.hash.label})`;
  guessFormulaEl.textContent = result.guessFormula;
}

function updatePassphraseStats(passphrase) {
  if (!passphrase) {
    wordEntropyEl.textContent = '—';
    wordEntropyNoteEl.textContent = 'Определяем автоматически при вводе слов.';
    return;
  }

  if (passphrase.looksLikeDiceware && passphrase.wordCount >= 2) {
    wordEntropyEl.textContent = `${passphrase.wordCount} слов · ~${passphrase.totalEntropy} бит`;
    wordEntropyNoteEl.textContent = 'Каждое слово добавляет ~11 бит при словаре Diceware.';
  } else if (passphrase.wordCount >= 2) {
    wordEntropyEl.textContent = `${passphrase.wordCount} слов`;
    wordEntropyNoteEl.textContent = 'Добавьте независимые слова, избегайте устойчивых выражений.';
  } else {
    wordEntropyEl.textContent = '—';
    wordEntropyNoteEl.textContent = 'Определяем автоматически при вводе слов.';
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
  if (!generatorForm || !generatedPasswordEl) {
    return;
  }

  updateLengthOutput();

  lengthInput?.addEventListener('input', updateLengthOutput);

  generateButton?.addEventListener('click', () => {
    const password = generatePassword();
    if (!password) return;

    if (copyButton) {
      copyButton.textContent = 'Скопировать';
    }

    input.value = password;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    showGeneratedPassword(password);
  });

  copyButton?.addEventListener('click', async () => {
    const text = generatedPasswordEl?.dataset.password;
    if (!text) return;

    await copyToClipboard(text, copyButton);
  });
}

function setupPassphraseGenerator() {
  if (!passphraseOutputEl) return;

  updatePassphraseCount();
  if (passphraseEntropyEl) {
    passphraseEntropyEl.textContent = '—';
  }

  passphraseCountInput?.addEventListener('input', updatePassphraseCount);

  generatePassphraseBtn?.addEventListener('click', () => {
    const phrase = generatePassphrase();
    if (!phrase) return;
    passphraseOutputEl.textContent = phrase.value;
    passphraseOutputEl.dataset.empty = 'false';
    passphraseOutputEl.dataset.passphrase = phrase.value;
    passphraseEntropyEl.textContent = `≈ ${phrase.entropy.toFixed(2)} бит энтропии`;

    if (copyPassphraseBtn) {
      copyPassphraseBtn.textContent = 'Скопировать';
    }

    input.value = phrase.value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  copyPassphraseBtn?.addEventListener('click', async () => {
    const text = passphraseOutputEl?.dataset.passphrase;
    if (!text) return;
    await copyToClipboard(text, copyPassphraseBtn);
  });
}

function setupBreachCheck() {
  if (!breachButton) return;

  breachButton.addEventListener('click', async () => {
    const password = input.value ?? '';
    if (!password.trim()) {
      breachStatusEl.textContent = 'Сначала введите пароль выше.';
      breachResultEl.textContent = '';
      return;
    }

    try {
      breachButton.disabled = true;
      breachStatusEl.textContent = 'Проверяем в HIBP…';
      breachResultEl.textContent = '';

      if (state.breachController) {
        state.breachController.abort();
      }

      state.breachController = new AbortController();
      const exposures = await queryPwned(password, state.breachController.signal);

      if (exposures > 0) {
        breachResultEl.textContent = `Пароль найден в утечках ${exposures.toLocaleString('ru-RU')} раз. Замените его немедленно.`;
      } else {
        breachResultEl.textContent = 'Не нашли совпадений в открытых утечках.';
      }
      breachStatusEl.textContent = 'Готово';
    } catch (error) {
      if (error?.name === 'AbortError') {
        breachStatusEl.textContent = 'Проверка отменена.';
      } else {
        breachStatusEl.textContent = 'Не удалось проверить — попробуйте позже.';
      }
    } finally {
      breachButton.disabled = false;
      state.breachController = null;
    }
  });
}

function setupModal() {
  if (!modal) return;

  const openers = document.querySelectorAll('[data-open-modal="privacy-modal"]');
  const closers = modal.querySelectorAll('[data-close-modal]');

  openers.forEach((button) => {
    button.addEventListener('click', () => openModal());
  });

  closers.forEach((button) => {
    button.addEventListener('click', () => closeModal());
  });

  modal.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.hasAttribute('data-close-modal')) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hasAttribute('hidden')) {
      closeModal();
    }
  });
}

function openModal() {
  modal.removeAttribute('hidden');
  const focusTarget = modal.querySelector('[data-close-modal]');
  focusTarget?.focus();
  document.body.classList.add('modal-open');
}

function closeModal() {
  modal.setAttribute('hidden', '');
  document.body.classList.remove('modal-open');
}

function updateLengthOutput() {
  if (!lengthInput || !lengthValue) return;
  lengthValue.textContent = lengthInput.value;
}

function updatePassphraseCount() {
  if (!passphraseCountInput || !passphraseCountValue) return;
  passphraseCountValue.textContent = passphraseCountInput.value;
}

function generatePassword() {
  const length = Number(lengthInput?.value ?? 0);
  if (!Number.isFinite(length) || length < 4) {
    return '';
  }

  const pools = [];
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  pools.push(lowercase);

  if (uppercaseCheckbox?.checked) {
    pools.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  }

  if (digitsCheckbox?.checked) {
    pools.push('0123456789');
  }

  if (symbolsCheckbox?.checked) {
    pools.push("!@#$%^&*()-_=+[]{};:'\",.<>/?`~");
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
  const count = Number(passphraseCountInput?.value ?? 0);
  if (!Number.isFinite(count) || count < 3) {
    return null;
  }

  const delimiter = passphraseDelimiter?.value ?? ' ';
  const words = [];

  for (let i = 0; i < count; i += 1) {
    const word = pickRandom(dicewareWords);
    if (!word) continue;
    const formatted = passphraseTitlecase?.checked ? capitalize(word) : word;
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
    button.textContent = 'Скопировано';
    setTimeout(() => {
      button.textContent = 'Скопировать';
    }, 2000);
  } catch (error) {
    button.textContent = 'Ошибка копирования';
    setTimeout(() => {
      button.textContent = 'Скопировать';
    }, 2000);
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
  if (!generatedPasswordEl) return;
  generatedPasswordEl.textContent = password;
  generatedPasswordEl.dataset.password = password;
  generatedPasswordEl.dataset.empty = 'false';
}

function updateHashDescription(hashId) {
  const profile = HASH_PROFILES.find((item) => item.id === hashId);
  hashDescriptionEl.textContent = profile?.description ?? '';
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
