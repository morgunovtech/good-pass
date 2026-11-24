# Good Pass

A small educational web app that shows how strong a password really is, how long it would take to crack, and what exactly to change to make it stronger.

**Live:** https://good-pass.pages.dev · **License:** MIT · **Русская версия:** [README.ru.md](README.ru.md)

## What it does

- **Analyzer.** Entropy in bits, estimated crack time, a score from very weak to excellent, strengths and weaknesses of the password, and recommendations with an example and the entropy each one adds.
- **Breach check.** Tells you whether the password appears in known breaches (Have I Been Pwned), without sending the password or its full hash anywhere.
- **Generator.** Random passwords with chosen length and character sets, or memorable passphrases from themed word lists, plus a batch of five at once.
- **Memory trainer.** Shows a password for five seconds, then checks how well you can type it from memory.
- **History, PNG export, shortcuts.** Recent checks stay in your browser; a result can be saved as an image; keyboard shortcuts for the main actions.
- **Works offline** as a PWA once loaded; light, dark and auto themes.
- **Languages.** The interface — labels, buttons, FAQ — switches between Russian and English (`public/locales/`). The analysis itself is Russian for now: the score, strengths, weaknesses, recommendations and error messages come from the API in Russian, and the generator's word lists are Russian.

## Privacy

- The breach check is k-anonymous: the browser hashes the password with SHA-1 and sends only the first 5 characters of the hash; the server asks Have I Been Pwned (`api.pwnedpasswords.com`) for every hash with that prefix and the match happens in the browser. The server keeps each HIBP answer in memory for 24 hours, by prefix.
- The analyzer runs on the server (a Cloudflare Pages Function) over HTTPS. The password is used for that one response and is never logged or stored. Each analysis writes one log line with the password's length, entropy and score; a rejected request (not a string, empty) or a failure is logged by its reason only.
- History lives in your browser's local storage and can be cleared in one click.

## API

Two `POST` endpoints, JSON in and out, served by the Pages Functions in production and by Express locally — the same handlers in `src/api.js`, so a test checks that both answer identically.

- `POST /api/v1/analyze` with `{ "password": "…" }` returns the score, entropy, estimated crack time, strengths, weaknesses and recommendations. A password over 128 characters gets `400`; a request body over 5 kB gets `413`.
- `POST /api/v1/breach-check` with `{ "hashPrefix": "5BAA6" }` — the first 5 hex characters of the SHA-1 — returns the matching suffixes with their counts. When Have I Been Pwned is unreachable the answer is still `200`, with an empty list and an `error` field, so the page says the check is unavailable instead of failing.
- The local Express server limits the API to 60 requests a minute per IP; the Pages Functions have no rate limit of their own.
- Express only: `GET /healthz` (`{"status":"ok"}`) and the legacy `POST /api/analyze`, a `307` redirect to `/api/v1/analyze`.

## Tech stack

Static front end in `public/` (vanilla JS modules, the [morgunov.tech design system](https://s.morgunov.tech) for styles and fonts, a service worker for offline use). The API lives in `functions/api/v1/` as Cloudflare Pages Functions; locally the same logic (`src/api.js`) is served by Express. Tests use the built-in `node:test`.

## Run locally

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

The suite covers the analyzer and the recommendations, the breach-check parsing, the HTTP API through Express, and the production setup (`test/pages.test.js`): the Pages Functions answer exactly like Express, only the 5-character prefix reaches HIBP, HIBP being down comes back as `200` with an `error`, `public/_headers` sends the same CSP as the server, and the HTML has nothing inline that the CSP would block.

CI runs the tests, `npm audit --omit=dev --audit-level=high` and a gitleaks secret scan on every pull request; `main` requires both checks to pass. Dependabot opens one grouped npm PR a week; minor and patch bumps merge on their own once CI is green, majors wait for a human.

## Deploy

Cloudflare Pages deploys `main` automatically: `public/` with the headers from `public/_headers`, and the Functions from `functions/`.

The service worker caches the static files under one name (`goodpass-v5` in `public/sw.js`); bump it whenever CSS or JS change, or returning visitors keep the old files. Versions follow SemVer and are listed in [CHANGELOG.md](CHANGELOG.md); the number in `package.json` and `src/log.js` (the `version` field of every log line) matches its top entry.

## What it creates outside the repo

- A Cloudflare Pages project `good-pass`, serving https://good-pass.pages.dev from `main` (no custom domain). Teardown: delete the project in the Cloudflare dashboard.
- On GitHub: branch protection on `main` with the required checks `test · audit` and `secrets`, «Allow auto-merge» for the Dependabot workflow, Dependabot itself.
- No API keys: the Have I Been Pwned range API is keyless.

---

Built by [Semyon Morgunov](https://s.morgunov.tech) with Claude Code as pair programmer.
