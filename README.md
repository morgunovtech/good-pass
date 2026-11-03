# Good Pass

A small educational web app that shows how strong a password really is, how long it would take to crack, and what exactly to change to make it stronger.

**Live:** https://good-pass.pages.dev · **License:** MIT · **Русская версия:** [README.ru.md](README.ru.md)

## What it does

- **Analyzer.** Entropy in bits, estimated crack time, a score from very weak to excellent, strengths and weaknesses of the password, and recommendations with an example and the entropy each one adds.
- **Breach check.** Tells you whether the password appears in known breaches (Have I Been Pwned), without sending the password or its full hash anywhere.
- **Generator.** Random passwords with chosen length and character sets, or memorable passphrases from themed word lists, plus a batch of five at once.
- **Memory trainer.** Shows a password for five seconds, then checks how well you can type it from memory.
- **History, PNG export, shortcuts.** Recent checks stay in your browser; a result can be saved as an image; keyboard shortcuts for the main actions.
- **Works offline** as a PWA once loaded; Russian and English interface; light, dark and auto themes.

## Privacy

- The breach check is k-anonymous: the browser hashes the password with SHA-1 and sends only the first 5 characters of the hash; the server asks Have I Been Pwned for every hash with that prefix and the match happens in the browser.
- The analyzer runs on the server (a Cloudflare Pages Function) over HTTPS. The password is used for that one response and is never logged or stored; logs record only error reasons.
- History lives in your browser's local storage and can be cleared in one click.

## Tech stack

Static front end in `public/` (vanilla JS modules, the [morgunov.tech design system](https://s.morgunov.tech) for styles and fonts, a service worker for offline use). The API lives in `functions/api/v1/` as Cloudflare Pages Functions; locally the same logic (`src/api.js`) is served by Express. Tests use the built-in `node:test`.

## Run locally

```bash
npm install
npm start                          # Express on http://localhost:3000
npx wrangler@4 pages dev public    # the production setup: Pages Functions and _headers
```

## Tests

```bash
npm test
```

CI runs the tests, `npm audit` and a gitleaks secret scan on every pull request.

## Deploy

Cloudflare Pages deploys `main` automatically: `public/` with the headers from `public/_headers`, and the Functions from `functions/`.

---

Built by [Semyon Morgunov](https://s.morgunov.tech) with Claude Code as pair programmer.
