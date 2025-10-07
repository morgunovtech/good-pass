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

function init() {
  if (!input) return;

  resetView();

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

init();
