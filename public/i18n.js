const STORAGE_KEY = 'good-pass-lang';
let currentLang = 'ru';
let strings = {};

export async function initI18n() {
  currentLang = localStorage.getItem(STORAGE_KEY) || navigator.language?.startsWith('en') ? 'en' : 'ru';
  // Default to Russian if detection is ambiguous.
  if (currentLang !== 'en') currentLang = 'ru';

  await loadLocale(currentLang);
  applyAll();

  document.getElementById('btn-lang')?.addEventListener('click', async () => {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    localStorage.setItem(STORAGE_KEY, currentLang);
    await loadLocale(currentLang);
    applyAll();
  });
}

async function loadLocale(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    strings = await res.json();
  } catch {
    strings = {};
  }
}

export function t(key, params) {
  let str = strings[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}

function applyAll() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel));
  });

  const btn = document.getElementById('btn-lang');
  if (btn) btn.textContent = currentLang === 'ru' ? 'EN' : 'RU';

  document.documentElement.lang = currentLang;
}

export function getLang() {
  return currentLang;
}
