// The 404 page speaks the main page's language (the saved choice, else the
// browser's) and has the same language menu; the theme is the family chrome's
// (theme-init.js before first paint, chrome.js for the menu).
import { initI18n } from './i18n.js';

await initI18n();
