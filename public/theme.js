const STORAGE_KEY = 'good-pass-theme';
const MODES = ['auto', 'light', 'dark'];

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) || 'auto';
  applyTheme(saved);

  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const current = document.documentElement.dataset.theme || 'auto';
    const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });
}

function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  const btn = document.getElementById('btn-theme');
  if (btn) {
    const labels = { auto: 'Авто', light: 'Светлая', dark: 'Тёмная' };
    btn.textContent = labels[mode] || 'Авто';
    btn.setAttribute('aria-label', `Тема: ${labels[mode]}. Нажмите для переключения.`);
  }
}
