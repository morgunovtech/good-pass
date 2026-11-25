import { initGenerator } from './generator.js';
import { initHistory, addToHistory } from './history.js';
import { initShortcuts } from './shortcuts.js';
import { initTrainer } from './trainer.js';
import { initExport } from './export.js';
import { initI18n, getLang, getLocale, t } from './i18n.js';

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

// The meter level of each score code the API returns (the code is the same in
// every language, the label is not).
const SCORE_LEVEL = { very_weak: 1, weak: 1, medium: 2, strong: 3, excellent: 4 };

// --- Init all modules ---
// Strings first: every module below renders through t().
await initI18n();
initGenerator();
initHistory();
initShortcuts();
initTrainer();
initExport();

// The visitor switched the language: redraw what the page wrote itself and
// ask the API again, so the analysis comes back in the new language.
document.addEventListener('langchange', () => {
  updateToggle(input.type !== 'password');
  const password = input.value;
  if (!password) {
    resetResults();
    return;
  }
  if (controller) controller.abort();
  clearTimeout(debounceTimer);
  strengthLabel.textContent = t('status_analyzing');
  analyzePassword(password, { record: false });
});

// --- Main tabs ---
document.querySelectorAll('[data-main-tab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.mainTab;
    document.querySelectorAll('[data-main-tab]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-analyzer').hidden = tab !== 'analyzer';
    document.getElementById('panel-generator').hidden = tab !== 'generator';
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
  updateToggle(isHidden);
  input.focus();
});

function updateToggle(visible) {
  if (!toggleButton) return;
  toggleButton.setAttribute('aria-pressed', String(visible));
  toggleButton.textContent = visible ? t('btn_hide') : t('btn_show');
  toggleButton.setAttribute('aria-label', visible ? t('aria_hide_password') : t('aria_show_password'));
}

// --- Copy ---
copyButton?.addEventListener('click', async () => {
  const password = input.value;
  if (!password) return;
  try {
    await navigator.clipboard.writeText(password);
    const orig = copyButton.textContent;
    copyButton.textContent = t('btn_copied');
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
  strengthLabel.textContent = password ? t('status_analyzing') : t('status_empty');

  if (copyButton) copyButton.hidden = !password;

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

// record: false re-asks for the same password (after a language switch)
// without adding it to the history again.
async function analyzePassword(password, { record = true } = {}) {
  controller = new AbortController();
  try {
    const response = await fetch('/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, lang: getLang() }),
      signal: controller.signal
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Server error');
    }

    const result = await response.json();
    lastAnalysis = result;
    renderResult(password, result);
    if (record) addToHistory({ password, score: result.score, entropyBits: result.entropyBits });

    // Breach check (async, non-blocking).
    checkBreach(password, result);
  } catch (error) {
    if (error.name === 'AbortError') return;
    strengthLabel.textContent = t('status_error');
    hideSkeleton();
  }
}

function renderResult(password, result) {
  hideSkeleton();
  meterFill.dataset.strength = String(SCORE_LEVEL[result.score] ?? 0);

  strengthLabel.textContent = password ? t('status_password', { score: result.scoreLabel }) : t('status_empty');
  scoreEl.textContent = result.scoreLabel ?? '\u2014';
  timeEl.textContent = result.estimatedTime ?? '\u2014';
  updateTimeTooltip(result.estimatedSeconds);
  entropyEl.textContent = result.entropyBits ? t('bits', { bits: result.entropyBits }) : '\u2014';

  renderList(strengthsList, result.strengths, t('list_strengths_empty'));
  renderList(weaknessesList, result.weaknesses, t('list_weaknesses_empty'));

  // Recommendations.
  renderRecommendations(result.recommendations);
}

function renderRecommendations(recs) {
  if (!recsContainer || !recsList) return;
  if (!recs || recs.length === 0) {
    recsContainer.hidden = true;
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
    gain.textContent = t('rec_entropy_gain', { bits: rec.entropyGain });

    const useBtn = document.createElement('button');
    useBtn.className = 'btn-action';
    useBtn.textContent = t('rec_try');
    useBtn.addEventListener('click', () => {
      input.value = rec.example;
      input.type = 'text';
      updateToggle(true);
      input.dispatchEvent(new Event('input'));
    });

    card.append(tip, example, gain, useBtn);
    recsList.appendChild(card);
  });
  recsContainer.hidden = false;
}

// --- Breach check via HIBP k-anonymity ---
async function checkBreach(password, analysis) {
  if (!breachBadge) return;
  breachBadge.textContent = t('breach_checking');
  breachBadge.className = 'badge badge-checking';
  breachBadge.hidden = false;

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
      body: JSON.stringify({ hashPrefix: prefix, lang: getLang() })
    });

    const result = await res.json();

    if (result.error && (!result.suffixes || result.suffixes.length === 0)) {
      breachBadge.textContent = t('breach_unavailable');
      breachBadge.className = 'badge badge-unavailable';
      lastBreachCount = null;
      updateNistBadge(analysis, null);
      return;
    }

    const match = result.suffixes.find((s) => s.suffix === suffix);
    lastBreachCount = match ? match.count : 0;

    if (match) {
      breachBadge.textContent = t('breach_found', { count: match.count.toLocaleString(getLocale()) });
      breachBadge.className = 'badge badge-breach-found';
    } else {
      breachBadge.textContent = t('breach_safe');
      breachBadge.className = 'badge badge-breach-safe';
    }
    breachBadge.title = t('breach_trust');

    updateNistBadge(analysis, lastBreachCount);
  } catch {
    breachBadge.textContent = t('breach_unavailable');
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

  if (len < 8) reasons.push(t('nist_reason_length'));
  if (breachCount && breachCount > 0) reasons.push(t('nist_reason_breached'));
  if (/^(.)\1+$/u.test(password)) reasons.push(t('nist_reason_repeated'));
  if (analysis?.weaknessCodes?.includes('common_pattern')) reasons.push(t('nist_reason_pattern'));

  if (reasons.length === 0) {
    nistBadge.textContent = t('nist_compliant');
    nistBadge.className = 'badge badge-nist-ok';
    nistBadge.title = '';
  } else {
    nistBadge.textContent = t('nist_noncompliant');
    nistBadge.className = 'badge badge-nist-fail';
    nistBadge.title = reasons.join('; ');
  }
  nistBadge.hidden = false;
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
    timeEl.title = t('time_tip_beyond');
    return;
  }
  timeEl.title = seconds < 1
    ? t('time_tip_instant')
    : t('time_tip_seconds', { seconds: seconds.toLocaleString(getLocale()) });
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
  strengthLabel.textContent = t('status_empty');
  updateToggle(false);
  if (input.type !== 'password') input.type = 'password';
  meterFill.dataset.strength = '0';
  scoreEl.textContent = '\u2014';
  timeEl.textContent = '\u2014';
  entropyEl.textContent = '\u2014';
  timeEl.removeAttribute('title');
  renderList(strengthsList, null, t('list_strengths_placeholder'));
  renderList(weaknessesList, null, t('list_weaknesses_placeholder'));
  if (analysisSection) analysisSection.classList.remove('visible');
  if (copyButton) copyButton.hidden = true;
  if (breachBadge) { breachBadge.hidden = true; breachBadge.textContent = ''; }
  if (nistBadge) { nistBadge.hidden = true; nistBadge.textContent = ''; }
  if (recsContainer) recsContainer.hidden = true;
  if (inlineBar) { inlineBar.style.opacity = '0'; inlineBar.style.width = '10%'; }
  lastAnalysis = null;
  lastBreachCount = null;
}

function showSkeleton() {
  for (const el of [scoreEl, timeEl, entropyEl]) el.classList.add('skeleton');
}
function hideSkeleton() {
  for (const el of [scoreEl, timeEl, entropyEl]) el.classList.remove('skeleton');
}

resetResults();
