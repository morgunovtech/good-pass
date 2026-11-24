const STORAGE_KEY = 'good-pass-lang';
export const LANGS = ['ru', 'en'];
let currentLang = 'ru';
let strings = {};

/**
 * The interface language: /en/ is English whatever was saved (it is the page
 * with English link-preview tags); elsewhere the visitor's saved choice, then
 * the browser language (English if it is English), then Russian.
 */
export function pickLang(stored, browserLang, path) {
  if (isEnglishPath(path)) return 'en';
  if (LANGS.includes(stored)) return stored;
  if (typeof browserLang === 'string' && browserLang.toLowerCase().startsWith('en')) return 'en';
  return 'ru';
}

function isEnglishPath(path) {
  return typeof path === 'string' && /^\/en\/?$/.test(path);
}

/**
 * The address after a switch to `lang`: / and /en/ follow the language, so a
 * copied link opens with the preview in the language on screen. Any other
 * path stays as it is (null).
 */
export function pathForLang(path, lang) {
  if (typeof path !== 'string' || !/^\/(en\/?)?$/.test(path)) return null;
  const next = lang === 'en' ? '/en/' : '/';
  return next === path ? null : next;
}

// Storage can be off (private mode, blocked site data): the choice then lasts
// for the visit only.
function storedLang() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function saveLang(lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* noop */ }
}

export async function initI18n() {
  // Opening /en/ is not a choice: the saved language stays for the next visit to /.
  currentLang = pickLang(storedLang(), navigator.language, location.pathname);

  await loadLocale(currentLang);
  applyAll();

  document.getElementById('btn-lang')?.addEventListener('click', async () => {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    saveLang(currentLang);
    const next = pathForLang(location.pathname, currentLang);
    if (next) history.replaceState(null, '', next + location.search + location.hash);
    await loadLocale(currentLang);
    applyAll();
    // Modules that render text themselves (analysis, history, theme) redraw.
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang } }));
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

/** The interface language as a locale for numbers and times. */
export function getLocale() {
  return currentLang === 'en' ? 'en-US' : 'ru-RU';
}
