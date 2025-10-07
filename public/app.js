import { analyzePassword } from './passwordAnalyzer.js';

const input = document.querySelector('#password-input');
const toggle = document.querySelector('#toggle-visibility');
const meterFill = document.querySelector('.meter__fill');
const strengthLabel = document.querySelector('#strength-label');
const scoreEl = document.querySelector('#score');
const timeEl = document.querySelector('#time');
const entropyEl = document.querySelector('#entropy');
const strengthsList = document.querySelector('#strengths');
const weaknessesList = document.querySelector('#weaknesses');
const historyList = document.querySelector('#history-list');

const generatorForm = document.querySelector('#generator-form');
const lengthInput = document.querySelector('#generator-length');
const lengthValue = document.querySelector('#generator-length-value');
const uppercaseCheckbox = document.querySelector('#generator-uppercase');
const digitsCheckbox = document.querySelector('#generator-digits');
const symbolsCheckbox = document.querySelector('#generator-symbols');
const generateButton = document.querySelector('#generate-password');
const copyButton = document.querySelector('#copy-generated');
const generatedPasswordEl = document.querySelector('#generated-password');

const HISTORY_LIMIT = 5;
const historyEntries = [];

function init() {
  if (!input) return;

  resetView();
  renderHistory();

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
}

function handleAnalyze() {
  const value = input.value ?? '';

  if (!value.trim()) {
    resetView();
    return;
  }

  const result = analyzePassword(value);
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
  updateTimeTooltip(result.estimatedSeconds);

  renderList(strengthsList, result.strengths, 'Введите пароль — сильные стороны появятся здесь.');
  renderList(
    weaknessesList,
    result.weaknesses,
    'Мы покажем, что усилить, как только появится пароль.'
  );

  recordHistory(password, result);
}

function resetView() {
  meterFill.dataset.strength = '0';
  strengthLabel.textContent = 'Введите пароль, чтобы начать проверку.';
  scoreEl.textContent = '—';
  timeEl.textContent = '—';
  timeEl.removeAttribute('title');
  entropyEl.textContent = '—';
  renderList(strengthsList, null, 'Введите пароль — сильные стороны появятся здесь.');
  renderList(weaknessesList, null, 'Мы покажем, что усилить, как только появится пароль.');
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
    container.append(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    container.append(li);
  }
}

function updateTimeTooltip(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    timeEl.removeAttribute('title');
    return;
  }

  if (!Number.isFinite(seconds) || seconds > 1e18) {
    timeEl.title = 'Практически не поддаётся перебору.';
    return;
  }

  if (seconds < 1) {
    timeEl.title = 'Меньше секунды — добавьте длину и разнообразие.';
    return;
  }

  timeEl.title = `Ориентировочно ${seconds.toLocaleString('ru-RU')} секунд.`;
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
      copyButton.textContent = 'Скопировано';
      setTimeout(() => {
        copyButton.textContent = 'Скопировать';
      }, 2000);
    } catch (error) {
      copyButton.textContent = 'Ошибка копирования';
      setTimeout(() => {
        copyButton.textContent = 'Скопировать';
      }, 2000);
    }
  });
}

function updateLengthOutput() {
  if (!lengthInput || !lengthValue) return;
  lengthValue.textContent = lengthInput.value;
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

function pickRandom(source) {
  if (!source || source.length === 0) return '';
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  const index = array[0] % source.length;
  return source.charAt(index);
}

function shuffleArray(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function showGeneratedPassword(password) {
  if (!generatedPasswordEl) return;
  generatedPasswordEl.textContent = password;
  generatedPasswordEl.dataset.password = password;
  generatedPasswordEl.dataset.empty = 'false';
}

function recordHistory(password, result) {
  const trimmed = password.trim();
  if (!trimmed) {
    return;
  }

  historyEntries.unshift({
    masked: maskPassword(trimmed),
    length: trimmed.length,
    score: result.scoreLabel ?? '—',
    time: result.estimatedTime ?? '—'
  });

  if (historyEntries.length > HISTORY_LIMIT) {
    historyEntries.length = HISTORY_LIMIT;
  }

  renderHistory();
}

function renderHistory() {
  if (!historyList) return;

  historyList.innerHTML = '';

  if (historyEntries.length === 0) {
    const li = document.createElement('li');
    li.className = 'history__item history__item--empty';
    li.textContent = 'Проверьте пароль, и он появится здесь.';
    historyList.append(li);
    return;
  }

  for (const entry of historyEntries) {
    const li = document.createElement('li');
    li.className = 'history__item';

    const topRow = document.createElement('div');
    topRow.className = 'history__row';

    const passwordSpan = document.createElement('span');
    passwordSpan.className = 'history__password';
    passwordSpan.textContent = entry.masked;
    passwordSpan.title = `Длина: ${entry.length} символов`;

    const meta = document.createElement('span');
    meta.className = 'history__meta';
    const scoreSpan = document.createElement('span');
    scoreSpan.textContent = entry.score;
    const timeSpan = document.createElement('span');
    timeSpan.textContent = entry.time;
    meta.append(scoreSpan, timeSpan);

    topRow.append(passwordSpan, meta);
    li.append(topRow);
    historyList.append(li);
  }
}

function maskPassword(password) {
  if (!password) return '';
  if (password.length <= 4) {
    return '•'.repeat(password.length);
  }

  const start = password.slice(0, 2);
  const end = password.slice(-1);
  const middleLength = Math.max(password.length - 3, 1);
  return `${start}${'•'.repeat(middleLength)}${end}`;
}

init();
