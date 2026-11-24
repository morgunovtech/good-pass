# Changelog

What changed for the person reading or running the code. Dates are merge dates. 1.2.0 is the first SemVer version: before it the version strings in `package.json` and `src/log.js` were calendar dates that matched no commit, so the two earlier entries are reconstructed from the history. English notes for each version also go to [Releases](https://github.com/morgunovtech/good-pass/releases).

## 1.2.0 — 2026-11-03

The API works in production, the interface is on the morgunov.tech design system, the repo is public with CI.

**Fixed**
- `POST /api/v1/analyze` and `/api/v1/breach-check` answered 405 on good-pass.pages.dev — Pages serves `public/` only, so the main feature showed «Не удалось получить ответ». The API now runs as Cloudflare Pages Functions (`functions/api/v1/`); the request handling they share with the local Express server lives in `src/api.js`, and the functions read the body the way `express.json()` does (JSON only, 5 kB limit) (#12).
- The strength meter filled a fifth of the bar at most: `width: 20%` next to `inset: 0` (#11).
- The PNG export's watermark named goodpass.app, which is not the project's domain; it now shows the page's own host (#13).

**Interface**
- Fonts, tokens and base styles come from the [morgunov.tech design system v1](https://s.morgunov.tech) at its canonical origin; `styles.css` follows its rules (no radius, shadows or gradients, IBM Plex Sans / Mono, mono micro-labels), the strength scale is the only colour set of Good Pass (#11). The PNG export draws in the same tokens and strength colours (#13).
- Pages sends the security headers that Express set only locally (`public/_headers`), with a Content-Security-Policy equal to the server's — the eight inline `style="display:none"` and the inline service-worker registration that it would block moved into attributes and `sw-register.js`; `404.html` and `robots.txt`, where unknown paths and `/robots.txt` used to return the home page with 200 (#10, #12).

**Project**
- CI on every pull request: `npm test`, `npm audit --omit=dev --audit-level=high`, gitleaks over the whole history; Dependabot (one grouped npm PR a week, Actions monthly) with auto-merge of minor and patch bumps once CI is green; `main` is protected with the checks required (#10, #13, #15).
- `test/pages.test.js`: the Functions answer exactly like Express, only the 5-character hash prefix reaches HIBP, `_headers` carries the server's CSP and the HTML has nothing inline that it blocks (#12).
- English README with a Russian twin, MIT licence, the repo is public (#14).
- Express 4.22.3 with qs 6.16.2 closes four Dependabot advisories; Express serves local runs and tests only (#16).

## 1.1.0 — 2026-03-27

A security and UX audit of the analyzer, then the feature expansion: generator, breach check, trainer, PWA, two interface languages.

**Analysis**
- Analyzer rewrite: entropy penalties for repetitive and dictionary passwords, a pattern dictionary grown from 14 to 120+ entries, Russian keyboard rows (ЙЦУКЕН, ФЫВА, ЯЧСМ), l33t-speak detection (`p@$$w0rd`), a separate Cyrillic charset, correct length for emoji; passwords are capped at 128 characters (cbae102).
- Recommendations: up to three concrete changes to the password with an example and the entropy each one adds, applied with a «try this» button (046fab7).
- Breach check through Have I Been Pwned with k-anonymity: SHA-1 in the browser, only the first 5 hex characters reach the server and HIBP, the suffixes are compared in the browser; the server caches range responses in memory for 24 hours. A NIST SP 800-63B badge (046fab7).

**New**
- Generator: random passwords (8–64 characters, charset toggles, `crypto.getRandomValues`) or passphrases from six themed Russian word lists (480+ words) with a separator, capitalisation and digits; five at once; a mnemonic tip for a passphrase (046fab7).
- Memory trainer (five seconds to memorise, then type it back), history of the last ten checks, PNG export of the result, an FAQ of eight questions, keyboard shortcuts (Ctrl+G, Ctrl+H, Esc), light / dark / auto theme (046fab7).
- Interface strings in Russian and English (`public/locales/`), a PWA with a service worker and a manifest (046fab7).

**Server**
- Rate limit of 60 requests a minute on the API, Content-Security-Policy, HSTS in production, gzip, static caching, `/api/v1/` with a 307 redirect from the legacy `/api/analyze`, try/catch around the handlers, `PORT` validation (cbae102). `POST /api/v1/breach-check`, the HIBP proxy (046fab7).
- Tests with `node:test`: 89, from 5 — analyzer, recommendations, breach check and the HTTP API (cbae102, 046fab7).

## 1.0.0 — 2025-10-07

The first version: an educational page that explains a password's strength.

- Analyzer (`src/passwordAnalyzer.js`): entropy in bits, estimated crack time, a score from very weak to excellent, strengths and weaknesses of the password.
- Express server (`src/server.js`) with the page in `public/`, `GET /healthz` and `POST /api/analyze`; the first tests (c2e4d7d, d1e4075, b5440bf, #1).
