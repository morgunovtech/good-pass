import { t } from './i18n.js';

const STORAGE_KEY = 'good-pass-theme';
const MODES = ['auto', 'light', 'dark'];

export function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* storage off */ }
  applyTheme(MODES.includes(saved) ? saved : 'auto');
  document.addEventListener('langchange', () => applyTheme(document.documentElement.dataset.theme));

  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'auto';
    const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage off */ }
  });
}

function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  const btn = document.getElementById('btn-theme');
  if (btn) {
    const label = t(`theme_${MODES.includes(mode) ? mode : 'auto'}`);
    btn.textContent = label;
    btn.setAttribute('aria-label', t('theme_aria', { theme: label }));
  }
}
