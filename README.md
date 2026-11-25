# Good Pass

A small educational web app that shows how strong a password really is, how long it would take to crack, and what exactly to change to make it stronger.

**Status:** an early version, still taking shape; not indexed by search engines on purpose · **Live:** https://good-pass.morgunov.tech (in English: https://good-pass.morgunov.tech/en/) · **License:** MIT · **Русская версия:** [README.ru.md](README.ru.md)

## What it does

- **Analyzer.** Entropy in bits, estimated crack time, a score from very weak to excellent, strengths and weaknesses of the password, and recommendations with an example and the entropy each one adds.
- **Breach check.** Tells you whether the password appears in known breaches (Have I Been Pwned), without sending the password or its full hash anywhere.
- **Generator.** Random passwords with chosen length and character sets, or memorable passphrases from themed word lists, plus a batch of five at once.
- **Memory trainer.** Shows a password for five seconds, then checks how well you can type it from memory.
- **History, PNG export, shortcuts.** The last ten checks stay in the open tab; a result can be saved as an image; keyboard shortcuts for the main actions: Ctrl/Cmd+G generates a password, Ctrl/Cmd+H shows or hides it, Esc closes the trainer and the history.
- **Installable as a PWA.** Once loaded, the page, the generator, the trainer and the themes work offline; the analyzer and the breach check need the network and say so. Light, dark, auto and high-contrast themes.
- **Languages.** Russian and English, switched in the bar at the top of the page: the interface (`public/locales/`), the analysis the API returns — score, crack time, strengths, weaknesses, recommendations, error messages (`src/i18n/`) — and the generator's word lists. The page starts in the visitor's saved choice, else in English for an English browser, else in Russian; https://good-pass.morgunov.tech/en/ always starts in English, and switching the language there moves the address to `/` (and back to `/en/` for English).

## Privacy

- The breach check is k-anonymous: the browser hashes the password with SHA-1 and sends only the first 5 characters of the hash; the server asks Have I Been Pwned (`api.pwnedpasswords.com`) for every hash with that prefix and the match happens in the browser. The server keeps each HIBP answer in memory for 24 hours, by prefix.
- The analyzer runs on the server (a Cloudflare Pages Function) over HTTPS. The password is used for that one response and is never logged or stored. Each analysis writes one log line with the password's length, entropy, score and language; a rejected request (not a string, empty) or a failure is logged by its reason only.
- History lives only in the page's memory: nothing is written to the browser's storage, it is gone when the tab is closed or reloaded, and it can be cleared in one click before that. The browser keeps only the chosen language and theme.
- The stylesheets and fonts (the morgunov.tech design system, IBM Plex) load from https://s.morgunov.tech, the author's own site: as any server it sees your IP and browser, sets no cookies and runs no analytics. The page itself loads no analytics.

## API

Two `POST` endpoints, JSON in and out, served by the Pages Functions in production and by Express locally — the same handlers in `src/api.js`, so a test checks that both answer identically.

```bash
curl -s -X POST -H 'content-type: application/json' \
  -d '{"password":"weekly-check-Storm#2045","lang":"en"}' \
  https://good-pass.morgunov.tech/api/v1/analyze
```

- `POST /api/v1/analyze` with `{ "password": "…", "lang": "en" }` returns the score, entropy, estimated crack time, strengths, weaknesses and recommendations. A password over 128 characters gets `400`; a request body over 5 kB gets `413`, malformed JSON `400`.
- `lang` is `"ru"` or `"en"` and sets the language of every text in the answer, errors included. It is optional: without it, or with any other value, the answer is Russian, exactly as before `lang` existed. Errors raised before the body is read (over 5 kB, malformed JSON) follow the first language of `Accept-Language` instead. `score` (`empty`, `very_weak`, `weak`, `medium`, `strong`, `excellent`) and `weaknessCodes` are the same in every language, for code that acts on the result.
- `POST /api/v1/breach-check` with `{ "hashPrefix": "5BAA6" }` — the first 5 hex characters of the SHA-1 — returns the matching suffixes with their counts; `lang` works here too. When Have I Been Pwned is unreachable the answer is still `200`, with an empty list and an `error` field, so the page says the check is unavailable instead of failing.
- The local Express server limits the API to 60 requests a minute per IP. The Pages Functions have no rate limit: Cloudflare's rate-limiting binding is a Workers feature that Pages Functions do not support, and a WAF rate-limiting rule in the morgunov.tech zone would cover good-pass.morgunov.tech only, while good-pass.pages.dev answers the same API outside the zone.
- Express only: `GET /healthz` (`{"status":"ok"}`) and the legacy `POST /api/analyze`, a `307` redirect to `/api/v1/analyze`.

## Tech stack

Static front end in `public/` (vanilla JS modules, the [morgunov.tech design system](https://s.morgunov.tech) for styles and fonts, a service worker for offline use). The API lives in `functions/api/v1/` as Cloudflare Pages Functions; locally the same logic (`src/api.js`) is served by Express (`src/server.js`), which does not run in production — it is for development and tests. `/en/` is the same page with English link-preview tags: LinkedIn, Telegram and other link previews read the `og:` tags without running the page, so `src/englishPage.js` rewrites the `<head>` of `public/index.html` in English (title, description, canonical, `og:url`, image, `og:locale`), served by the Pages Function in `functions/en/` and by Express locally. The API's texts are one dictionary per language in `src/i18n/`. Tests use the built-in `node:test`.

For search engines and AI assistants: while the service is not ready, the owner keeps it out of search results. `public/_headers` sends `X-Robots-Tag: noindex` on every path (`src/server.js` does the same locally), `public/index.html` carries `<meta name="robots" content="noindex">`, which `/en/` inherits, there is no sitemap, and `public/robots.txt` gives the Content Signals `search=no, ai-input=yes, ai-train=yes` ([contentsignals.org](https://contentsignals.org): AI answers and AI training may use the site, search results may not). Crawlers stay allowed, because a crawler has to fetch a page to see its `noindex`. The page still carries a JSON-LD `WebApplication` block (author: the same `Person` as on s.morgunov.tech) and the Yandex Webmaster verification meta, and `public/llms.txt` describes the service, its privacy and the API in plain text. To be indexed again: drop the header line, the meta tag and `search=no`, bring back `sitemap.xml` with its `Sitemap:` line in `robots.txt`, and bump the service worker cache.

## Run locally

Node: the current LTS (`lts/*`, what CI runs); nothing else to install.

```bash
npm install
npm start                          # Express on http://localhost:3000
npm run dev                        # the same with NODE_ENV=development set explicitly (HSTS and the one-day static cache are production-only)
npx wrangler@4 pages dev public    # the production setup: Pages Functions and _headers
```

## Tests

```bash
npm test
```

The suite covers the analyzer and the recommendations, the breach-check parsing, the HTTP API through Express, and the production setup (`test/pages.test.js`): the Pages Functions answer exactly like Express in both languages, only the 5-character prefix reaches HIBP, HIBP being down comes back as `200` with an `error`, `public/_headers` sends the same CSP as the server, `noindex` on every path (the Express server too) and on the pages.dev host, and the HTML has nothing inline that the CSP would block (the JSON-LD block is data, which the browser never runs); `robots.txt` gives every group the content signals and names no sitemap, which is not served either, `index.html` and `/en/` carry the `noindex` meta, `llms.txt` is served as text, the JSON-LD parses and names the canonical address; `/en/` finds every tag it rewrites, leaves no Russian in them, keeps the static headers, answers the same through the Function and Express, and points at a 1200×630 English PNG. `test/i18n.test.js` checks the languages: the page's language pick (`/en/` included), the same keys in every dictionary, no Cyrillic left in English, the word lists.

CI runs the tests, `npm audit --omit=dev --audit-level=high` and a gitleaks secret scan on every pull request; `main` requires both checks to pass. Dependabot opens one grouped npm PR a week; minor and patch bumps merge on their own once CI is green, majors wait for a human.

## Deploy

Cloudflare Pages deploys `main` to https://good-pass.morgunov.tech automatically: `public/` with the headers from `public/_headers`, and the Functions from `functions/` (the API and `/en/`).

The service worker caches the static files under one name (`goodpass-v14` in `public/sw.js`); bump it whenever the page, CSS or JS change, or returning visitors keep the old files: 1.4.3 bumped it for the `noindex` meta tag in `index.html`, which returning visitors would otherwise not get, 1.5.0 for the family chrome. The bar, the language and theme menus, the primary button and the footer are shared by the morgunov.tech services: the markup is the "Service chrome" section of `ds/v1/USAGE.md` in [about-me-page](https://github.com/morgunovtech/about-me-page), the styles are the design system's `components.css`. The chrome's script, `public/chrome.js`, is a copy of `https://s.morgunov.tech/ds/v1/chrome.js` kept on this origin (the CSP allows scripts from here only); `test/pages.test.js` checks its hash, and the number in the test changes together with the copy. `public/theme-init.js` sets the theme before first paint. The link previews, 1200×630 PNGs, are renders of the family's share-card template (the morgunov.tech design system, `templates/share-card`, cards `goodpass-ru` and `goodpass-en`; the rules are its `guidelines/IMAGERY.md`): `public/og-image.png`, Russian, for `/`, and `public/og-image-en.png`, English, for `/en/`. A card's text is changed in the template's `cards.js`; a card drawn in this repo would drift from the other morgunov.tech links again. Versions follow SemVer and are listed in [CHANGELOG.md](CHANGELOG.md); the number in `package.json` and `src/log.js` (the `version` field of every log line) matches its top entry.

## What it creates outside the repo

- A Cloudflare Pages project `good-pass`, serving `main` on the custom domains good-pass.morgunov.tech (primary) and gpass.morgunov.tech (a Cloudflare redirect rule sends it to the primary with a 308, keeping the path and the query: unlike a 301, a 308 keeps a `POST` a `POST`, so API calls to the old address still work); their DNS records are in the morgunov.tech zone. https://good-pass.pages.dev is the project's technical Cloudflare host: it keeps working, and `public/_headers` tells search engines not to index it. Teardown: delete the project, the two DNS records and the redirect rule in the Cloudflare dashboard.
- On GitHub: branch protection on `main` with the required checks `test · audit` and `secrets`, «Allow auto-merge» for the Dependabot workflow, Dependabot itself.
- No API keys: the Have I Been Pwned range API is keyless.
- SonarQube Cloud: the GitHub App on this repository and the project `morgunovtech_good-pass` (automatic analysis, no config or token in the repo). Teardown: delete the project on sonarcloud.io and remove the repository from the app's installation.
- Search engines: the Yandex Webmaster verification meta in `public/index.html` (remove the site in Yandex Webmaster to tear down), an address property in Google Search Console (verified through the morgunov.tech domain property) and the Bing Webmaster import of it. The registrations stay while the site is `noindex`: they show the pages leaving the index. The owner may remove the properties later; if a sitemap was submitted there, it now answers 404 and should be deleted.

---

Built by [Semyon Morgunov](https://s.morgunov.tech) with Claude Code as pair programmer.
