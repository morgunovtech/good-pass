import ru from './ru.js';
import en from './en.js';

// The language of the API's texts. Requests without "lang" get Russian, as
// they did before English existed, so older clients keep working.
const DICTIONARIES = { ru, en };
export const DEFAULT_LANG = 'ru';
export const LANGS = Object.keys(DICTIONARIES);

/** "en", "EN", "en-GB" → "en"; anything unknown or missing → "ru". */
export function resolveLang(value) {
  if (typeof value !== 'string') return DEFAULT_LANG;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return Object.hasOwn(DICTIONARIES, primary) ? primary : DEFAULT_LANG;
}

/**
 * For errors raised before the JSON body is read (too large, malformed),
 * where "lang" is out of reach: the first language of Accept-Language.
 */
export function langFromAcceptLanguage(header) {
  const first = String(header ?? '').split(',')[0].split(';')[0];
  return resolveLang(first);
}

export function messagesFor(lang) {
  return DICTIONARIES[resolveLang(lang)];
}
