// The theme before first paint, the way every morgunov.tech page does it
// (ds/v1/USAGE.md in about-me-page): data-theme on <html> is the attribute the
// design system's tokens switch on (light, dark, high-contrast), and
// data-theme-preference keeps the choice itself, "auto" included. A plain
// script in the <head>, not a module and not inline (the CSP allows scripts
// from this origin only), so the first paint already has the right colours.
// theme-preference is the key the family's chrome script (chrome.js) reads
// and writes; good-pass-theme is the key this page used before 1.5.0: found
// here, it is moved to the shared key and removed.
(function () {
  var root = document.documentElement;
  var pref = null;
  try {
    pref = localStorage.getItem('theme-preference');
    if (!pref) {
      pref = localStorage.getItem('good-pass-theme');
      if (pref) {
        localStorage.removeItem('good-pass-theme');
        if (pref === 'auto' || pref === 'light' || pref === 'dark') localStorage.setItem('theme-preference', pref);
      }
    }
  } catch (e) { /* storage blocked: the system setting decides */ }
  if (pref !== 'light' && pref !== 'dark' && pref !== 'high-contrast') pref = 'auto';
  var dark = false;
  try { dark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { /* no matchMedia: light */ }
  root.setAttribute('data-theme', pref === 'auto' ? (dark ? 'dark' : 'light') : pref);
  root.setAttribute('data-theme-preference', pref);
})();
