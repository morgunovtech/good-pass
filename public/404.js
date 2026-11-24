// The 404 page speaks the main page's language (the saved choice, else the
// browser's) and has the same switch; the saved theme applies here too.
import { initI18n } from './i18n.js';
import { initTheme } from './theme.js';

await initI18n();
initTheme();
