import { initGenerator } from './generator.js';
import { initHistory, addToHistory } from './history.js';
import { initTheme } from './theme.js';
import { initShortcuts } from './shortcuts.js';
import { initTrainer } from './trainer.js';
import { initExport } from './export.js';
import { initI18n } from './i18n.js';

// DOM refs.
const input = document.getElementById('password-input');
const strengthLabel = document.getElementById('strength-label');
const toggleButton = document.getElementById('toggle-visibility');
const meterFill = document.querySelector('.meter-fill');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const entropyEl = document.getElementById('entropy');
const strengthsList = document.getElementById('strengths');
const weaknessesList = document.getElementById('weaknesses');
const analysisSection = document.querySelector('.analysis');
const copyButton = document.getElementById('copy-password');
const inlineBar = document.getElementById('inline-bar');
const breachBadge = document.getElementById('breach-badge');
const nistBadge = document.getElementById('nist-badge');
const recsContainer = document.getElementById('recommendations');
const recsList = document.getElementById('recommendations-list');

let controller;
let debounceTimer;
let lastAnalysis = null;
let lastBreachCount = null;

// --- Init all modules ---
initGenerator();
initHistory();
initTheme();
initShortcuts();
initTrainer();
initExport();
initI18n();

// --- Main tabs ---
document.querySelectorAll('[data-main-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.mainTab;
    document.querySelectorAll('[data-main-tab]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-analyzer').style.display = tab === 'analyzer' ? '' : 'none';
    document.getElementById('panel-generator').style.display = tab === 'generator' ? '' : 'none';
  });
});

// --- History sidebar toggle (outer button) ---
document.getElementById('btn-toggle-history-outer')?.addEventListener('click', () => {
  document.getElementById('history-sidebar')?.classList.toggle('open');
});

// --- Toggle password visibility ---
toggleButton?.addEventListener('click', () => {
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  toggleButton.setAttribute('aria-pressed', String(isHidden));
  toggleButton.textContent = isHidden ? 'Скрыть' : 'Показать';
  toggleButton.setAttribute('aria-label', isHidden ? 'Скрыть пароль' : 'Показать пароль');
  input.focus();
});

// --- Copy ---
copyButton?.addEventListener('click', async () => {
  const password = input.value;
  if (!password) return;
  try {
    await navigator.clipboard.writeText(password);
    const orig = copyButton.textContent;
    copyButton.textContent = 'Скопировано!';
    setTimeout(() => { copyButton.textContent = orig; }, 1500);
  } catch { /* noop */ }
});

// --- Generate from analyzer panel ---
document.getElementById('generate-password')?.addEventListener('click', () => {
  // Delegate to generator panel's generate button.
  document.getElementById('btn-generate')?.click();
});

// --- Input handler ---
input.addEventListener('input', (event) => {
  const password = event.target.value;
  strengthLabel.textContent = password ? 'Анализируем\u2026' : 'Введите пароль, чтобы начать.';

  if (copyButton) copyButton.style.display = password ? '' : 'none';

  if (controller) controller.abort();

  if (!password) {
    clearTimeout(debounceTimer);
    resetResults();
    return;
  }

  if (analysisSection) analysisSection.classList.add('visible');
  showSkeleton();
  updateInlineBar(password);

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => analyzePassword(password), 250);
});

async function analyzePassword(password) {
  controller = new AbortController();
  try {
    const response = await fetch('/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      signal: controller.signal
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Server error');
    }

    const result = await response.json();
    lastAnalysis = result;
    renderResult(password, result);
    addToHistory({ password, scoreLabel: result.scoreLabel, entropyBits: result.entropyBits });

    // Breach check (async, non-blocking).
    checkBreach(password, result);
  } catch (error) {
    if (error.name === 'AbortError') return;
    strengthLabel.textContent = 'Не удалось получить ответ. Попробуйте снова.';
    hideSkeleton();
  }
}

function renderResult(password, result) {
  hideSkeleton();
  const strengthLevel = mapScoreToLevel(result.scoreLabel);
  meterFill.dataset.strength = strengthLevel.toString();

  strengthLabel.textContent = password ? `Пароль: ${result.scoreLabel}` : 'Введите пароль, чтобы начать.';
  scoreEl.textContent = result.scoreLabel ?? '\u2014';
  timeEl.textContent = result.estimatedTime ?? '\u2014';
  updateTimeTooltip(result.estimatedSeconds);
  entropyEl.textContent = result.entropyBits ? `${result.entropyBits} бит` : '\u2014';

  renderList(strengthsList, result.strengths, 'Добавьте больше длины и разнообразия.');
  renderList(weaknessesList, result.weaknesses, 'Пароль выглядит устойчивым — продолжайте в том же духе.');

  // Recommendations.
  renderRecommendations(result.recommendations);
}

function renderRecommendations(recs) {
  if (!recsContainer || !recsList) return;
  if (!recs || recs.length === 0) {
    recsContainer.style.display = 'none';
    return;
  }

  recsList.replaceChildren();
  recs.forEach((rec) => {
    const card = document.createElement('div');
    card.className = 'recommendation-card';

    const tip = document.createElement('p');
    tip.className = 'rec-tip';
    tip.textContent = rec.tip;

    const example = document.createElement('p');
    example.className = 'rec-example';
    example.textContent = rec.example;

    const gain = document.createElement('span');
    gain.className = 'rec-gain';
    gain.textContent = `+${rec.entropyGain} бит`;

    const useBtn = document.createElement('button');
    useBtn.className = 'btn-action';
    useBtn.textContent = 'Попробовать';
    useBtn.addEventListener('click', () => {
      input.value = rec.example;
      input.type = 'text';
      toggleButton.setAttribute('aria-pressed', 'true');
      toggleButton.textContent = 'Скрыть';
      input.dispatchEvent(new Event('input'));
    });

    card.append(tip, example, gain, useBtn);
    recsList.appendChild(card);
  });
  recsContainer.style.display = '';
}

// --- Breach check via HIBP k-anonymity ---
async function checkBreach(password, analysis) {
  if (!breachBadge) return;
  breachBadge.textContent = 'Проверяем утечки\u2026';
  breachBadge.className = 'badge badge-checking';
  breachBadge.style.display = '';

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.slice(0, 5);
    const suffix = hashHex.slice(5);

    const res = await fetch('/api/v1/breach-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashPrefix: prefix })
    });

    const result = await res.json();

    if (result.error && (!result.suffixes || result.suffixes.length === 0)) {
      breachBadge.textContent = 'Проверка утечек недоступна';
      breachBadge.className = 'badge badge-unavailable';
      lastBreachCount = null;
      updateNistBadge(analysis, null);
      return;
    }

    const match = result.suffixes.find((s) => s.suffix === suffix);
    lastBreachCount = match ? match.count : 0;

    if (match) {
      breachBadge.textContent = `Найден в ${match.count.toLocaleString('ru-RU')} утечках!`;
      breachBadge.className = 'badge badge-breach-found';
      breachBadge.title = 'Мы не отправляем ваш пароль. Используется метод k-анонимности.';
    } else {
      breachBadge.textContent = 'Не найден в известных утечках';
      breachBadge.className = 'badge badge-breach-safe';
      breachBadge.title = 'Мы не отправляем ваш пароль. Используется метод k-анонимности.';
    }

    updateNistBadge(analysis, lastBreachCount);
  } catch {
    breachBadge.textContent = 'Проверка утечек недоступна';
    breachBadge.className = 'badge badge-unavailable';
    lastBreachCount = null;
    updateNistBadge(analysis, null);
  }
}

// --- NIST SP 800-63B compliance ---
function updateNistBadge(analysis, breachCount) {
  if (!nistBadge) return;

  const reasons = [];
  const password = input.value;
  const len = [...password].length;

  if (len < 8) reasons.push('Минимум 8 символов');
  if (breachCount && breachCount > 0) reasons.push('Найден в утечках');
  if (/^(.)\1+$/u.test(password)) reasons.push('Повторяющиеся символы');

  const hasCommonPattern = analysis?.weaknesses?.some((w) => w.includes('популярный шаблон'));
  if (hasCommonPattern) reasons.push('Содержит распространённый шаблон');

  if (reasons.length === 0) {
    nistBadge.textContent = 'Соответствует NIST SP 800-63B';
    nistBadge.className = 'badge badge-nist-ok';
    nistBadge.title = '';
  } else {
    nistBadge.textContent = 'Не соответствует NIST';
    nistBadge.className = 'badge badge-nist-fail';
    nistBadge.title = reasons.join('; ');
  }
  nistBadge.style.display = '';
}

// --- Inline color bar under input ---
function updateInlineBar(password) {
  if (!inlineBar) return;
  const len = [...password].length;
  let level = 0;
  if (len >= 4) level = 1;
  if (len >= 8) level = 2;
  if (len >= 12 && /[A-Z]/i.test(password) && /\d/.test(password)) level = 3;
  if (len >= 16 && /[^A-Za-z0-9]/.test(password)) level = 4;

  const widths = ['10%', '25%', '50%', '75%', '100%'];
  inlineBar.style.width = widths[level];
  // --strength-0…4 live in styles.css, tuned for the light and dark themes.
  inlineBar.style.backgroundColor = `var(--strength-${level})`;
  inlineBar.style.opacity = password ? '1' : '0';
}

function updateTimeTooltip(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    timeEl.removeAttribute('title');
    return;
  }
  if (!Number.isFinite(seconds)) {
    timeEl.title = 'Больше 10^18 секунд — практический перебор невозможен.';
    return;
  }
  timeEl.title = seconds < 1
    ? 'Меньше секунды. Нужно увеличить длину и разнообразие.'
    : `Оценка перебора: ~${seconds.toLocaleString('ru-RU')} секунд.`;
}

function renderList(container, items, emptyState) {
  container.replaceChildren();
  if (!items || items.length === 0) {
    const li = document.createElement('li');
    li.textContent = emptyState;
    container.appendChild(li);
    return;
  }
  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    container.appendChild(li);
  });
}

function resetResults() {
  strengthLabel.textContent = 'Введите пароль, чтобы начать.';
  if (toggleButton) {
    toggleButton.textContent = 'Показать';
    toggleButton.setAttribute('aria-pressed', 'false');
    toggleButton.setAttribute('aria-label', 'Показать пароль');
  }
  if (input.type !== 'password') input.type = 'password';
  meterFill.dataset.strength = '0';
  scoreEl.textContent = '\u2014';
  timeEl.textContent = '\u2014';
  entropyEl.textContent = '\u2014';
  timeEl.removeAttribute('title');
  renderList(strengthsList, null, 'Введите пароль, чтобы увидеть сильные стороны.');
  renderList(weaknessesList, null, 'Печатайте пароль — здесь появятся подсказки.');
  if (analysisSection) analysisSection.classList.remove('visible');
  if (copyButton) copyButton.style.display = 'none';
  if (breachBadge) { breachBadge.style.display = 'none'; breachBadge.textContent = ''; }
  if (nistBadge) { nistBadge.style.display = 'none'; nistBadge.textContent = ''; }
  if (recsContainer) recsContainer.style.display = 'none';
  if (inlineBar) { inlineBar.style.opacity = '0'; inlineBar.style.width = '10%'; }
  lastAnalysis = null;
  lastBreachCount = null;
}

function mapScoreToLevel(score) {
  switch (score) {
    case 'Очень слабый': case 'Слабый': return 1;
    case 'Средний': return 2;
    case 'Сильный': return 3;
    case 'Отличный': return 4;
    default: return 0;
  }
}

function showSkeleton() {
  for (const el of [scoreEl, timeEl, entropyEl]) el.classList.add('skeleton');
}
function hideSkeleton() {
  for (const el of [scoreEl, timeEl, entropyEl]) el.classList.remove('skeleton');
}

resetResults();
