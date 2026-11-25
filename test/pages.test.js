import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

import { onRequestPost as analyze } from '../functions/api/v1/analyze.js';
import { onRequestPost as breachCheck } from '../functions/api/v1/breach-check.js';
import { onRequest as englishPageFunction } from '../functions/en/index.js';
import { onRequest as sitemapFunction } from '../functions/sitemap.xml.js';
import { englishPage, EN } from '../src/englishPage.js';
import { clearCache } from '../src/breachCheck.js';
import { app } from '../src/server.js';

// What Cloudflare Pages serves in production: functions/ for the API and
// public/ with the headers from public/_headers.

function post(handler, body, headers = { 'Content-Type': 'application/json' }) {
  const request = new Request('https://good-pass.morgunov.tech/api/v1/x', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
  return handler({ request });
}

describe('Pages Function: POST /api/v1/analyze', () => {
  it('analyzes a valid password', async () => {
    const res = await post(analyze, { password: 'TestPassword123!' });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
    const body = await res.json();
    assert.ok(body.scoreLabel);
    assert.equal(typeof body.entropyBits, 'number');
    assert.ok(Array.isArray(body.strengths));
    assert.ok(Array.isArray(body.recommendations));
  });

  it('answers like the Express server', async () => {
    const server = app.listen(0);
    try {
      await new Promise((resolve) => server.once('listening', resolve));
      const { port } = server.address();
      // Passwords without recommendations: those carry random examples.
      const bodies = [];
      for (const lang of [undefined, 'en']) {
        for (const password of ['X$k9Lm!2qW@7nRtP-ZvBc3Fg8Jh', '', 5, 'A'.repeat(200)]) {
          bodies.push(JSON.stringify({ password, lang }));
        }
      }
      // Bodies that never reach the handler: over 5 kB, malformed JSON.
      bodies.push(JSON.stringify({ password: 'a'.repeat(6000) }), '{"password":');

      for (const acceptLanguage of ['ru-RU,ru;q=0.9', 'en-US,en;q=0.9']) {
        const headers = { 'Content-Type': 'application/json', 'Accept-Language': acceptLanguage };
        for (const body of bodies) {
          const viaExpress = await fetch(`http://localhost:${port}/api/v1/analyze`, { method: 'POST', headers, body });
          const viaPages = await post(analyze, body, headers);
          assert.equal(viaPages.status, viaExpress.status, body.slice(0, 40));
          assert.deepEqual(await viaPages.json(), await viaExpress.json(), body.slice(0, 40));
        }
      }
    } finally {
      server.close();
    }
  });

  it('answers in English when asked, in Russian by default', async () => {
    const en = await (await post(analyze, { password: 'weekly-check-Storm#2045', lang: 'en' })).json();
    assert.equal(en.scoreLabel, 'Excellent');
    assert.equal(en.score, 'excellent');
    assert.doesNotMatch(JSON.stringify(en), /[а-яё]/i);

    const ru = await (await post(analyze, { password: 'weekly-check-Storm#2045' })).json();
    assert.equal(ru.scoreLabel, 'Отличный');
    assert.equal(ru.score, 'excellent');

    const error = await (await post(analyze, { password: 5, lang: 'en' })).json();
    assert.equal(error.error, 'The password must be a string.');
  });

  it('reads the language of an unreadable body from Accept-Language', async () => {
    const headers = { 'Content-Type': 'application/json', 'Accept-Language': 'en-GB,en;q=0.9' };
    const res = await post(analyze, '{"password":', headers);
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'Malformed JSON.');
    const ru = await post(analyze, '{"password":');
    assert.equal((await ru.json()).error, 'Некорректный JSON.');
  });

  it('returns 400 for a non-string password', async () => {
    const res = await post(analyze, { password: 12345 });
    assert.equal(res.status, 400);
    assert.ok((await res.json()).error);
  });

  it('treats a non-JSON body as empty, like express.json()', async () => {
    const res = await post(analyze, 'password=hello', { 'Content-Type': 'text/plain' });
    assert.equal(res.status, 400);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await post(analyze, '{"password":');
    assert.equal(res.status, 400);
  });

  it('returns 413 for a body over 5 kB', async () => {
    const res = await post(analyze, { password: 'a'.repeat(6000) });
    assert.equal(res.status, 413);
  });

  it('rejects a password longer than 128 characters', async () => {
    const res = await post(analyze, { password: 'A'.repeat(200) });
    assert.equal(res.status, 400);
  });
});

describe('Pages Function: POST /api/v1/breach-check', () => {
  beforeEach(() => clearCache());

  it('sends only the 5-character prefix to HIBP (k-anonymity)', async (t) => {
    const urls = [];
    t.mock.method(globalThis, 'fetch', async (url) => {
      urls.push(String(url));
      return new Response('0018A45C4D1DEF81644B54AB7F969B88D65:3\r\nFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:0\r\n');
    });

    const res = await post(breachCheck, { hashPrefix: '5baa6' });
    assert.equal(res.status, 200);
    assert.deepEqual(urls, ['https://api.pwnedpasswords.com/range/5BAA6']);
    const body = await res.json();
    assert.deepEqual(body.suffixes[0], { suffix: '0018A45C4D1DEF81644B54AB7F969B88D65', count: 3 });
  });

  it('rejects an invalid prefix without calling HIBP', async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(''));
    for (const hashPrefix of ['AB', 'GHIJK', '5BAA61E4', undefined]) {
      const res = await post(breachCheck, { hashPrefix });
      assert.equal(res.status, 400);
    }
    assert.equal(fetchMock.mock.callCount(), 0);
  });

  it('reports HIBP being down as unavailable, not as an error status', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response('', { status: 503 }));
    const res = await post(breachCheck, { hashPrefix: 'ABCDE' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.suffixes, []);
    assert.equal(body.error, 'Проверка утечек временно недоступна.');

    const en = await (await post(breachCheck, { hashPrefix: 'ABCDE', lang: 'en' })).json();
    assert.equal(en.error, 'The breach check is temporarily unavailable.');
  });
});

// A PNG of 1200×630 in public/: the size LinkedIn, Telegram and X show in full.
async function assertPreviewPng(url) {
  const prefix = 'https://good-pass.morgunov.tech/';
  assert.ok(url.startsWith(prefix) && url.endsWith('.png'), url);
  const png = await readFile(new URL(`../public/${url.slice(prefix.length)}`, import.meta.url));
  assert.equal(png.toString('ascii', 1, 4), 'PNG', url);
  assert.equal(png.readUInt32BE(16), 1200, url);
  assert.equal(png.readUInt32BE(20), 630, url);
}

const meta = (html, key) => {
  const found = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)" />`));
  assert.ok(found, key);
  return found[1];
};

describe('Pages Function: GET /en/', () => {
  const CSP = "default-src 'self'";
  let indexHtml;
  let assetsAsked;
  const env = {
    ASSETS: {
      fetch: async (url) => {
        assetsAsked.push(String(url));
        return new Response(indexHtml, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Security-Policy': CSP,
            'X-Robots-Tag': 'noindex',
            ETag: '"index"'
          }
        });
      }
    }
  };
  const call = (path, method = 'GET') => {
    let nextCalled = false;
    const next = async () => {
      nextCalled = true;
      return new Response('next');
    };
    const request = new Request(`https://good-pass.morgunov.tech${path}`, { method });
    return englishPageFunction({ request, env, next }).then((res) => ({ res, nextCalled }));
  };

  before(async () => {
    indexHtml = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  });
  beforeEach(() => {
    assetsAsked = [];
  });

  it('finds every tag it rewrites in index.html', () => {
    assert.deepEqual(englishPage(indexHtml).missing, []);
  });

  it('serves index.html with English link-preview tags and the static headers', async () => {
    const { res } = await call('/en/');
    assert.equal(res.status, 200);
    assert.deepEqual(assetsAsked, ['https://good-pass.morgunov.tech/']);
    assert.equal(res.headers.get('content-security-policy'), CSP);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex', 'the site-wide noindex comes along');
    assert.equal(res.headers.get('etag'), null, 'not the ETag of the Russian page');
    const html = await res.text();
    const head = html.slice(0, html.indexOf('</head>'));
    assert.match(head, /<html lang="en" data-theme="auto">/);
    assert.equal(meta(head, 'robots'), 'noindex', 'the rewrite leaves the robots meta alone');
    assert.match(head, /<link rel="canonical" href="https:\/\/good-pass\.morgunov\.tech\/en\/" \/>/);
    assert.equal(meta(head, 'og:url'), 'https://good-pass.morgunov.tech/en/');
    assert.equal(meta(head, 'og:title'), EN.title);
    assert.equal(meta(head, 'og:description'), EN.description);
    assert.equal(meta(head, 'description'), EN.description);
    assert.equal(meta(head, 'og:locale'), 'en_US');
    assert.match(meta(head, 'og:image'), /\/og-image-en\.png$/);
    await assertPreviewPng(meta(head, 'og:image'));
    // Only the JSON-LD block and the page body may stay Russian on /en/.
    const tags = head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '').match(/<(meta|title)[^>]*>[^<]*/g);
    for (const tag of tags) assert.doesNotMatch(tag, /[а-яё]/i, tag);
    assert.equal(html.slice(head.length), indexHtml.slice(indexHtml.indexOf('</head>')), 'only the head changes');
  });

  it('uses the English title the page sets for itself', async () => {
    const en = JSON.parse(await readFile(new URL('../public/locales/en.json', import.meta.url), 'utf8'));
    assert.equal(EN.title, en.meta_title);
  });

  it('redirects /en to /en/, query included', async () => {
    const { res } = await call('/en?ref=linkedin');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), 'https://good-pass.morgunov.tech/en/?ref=linkedin');
  });

  it('answers HEAD and leaves other methods to the next handler', async () => {
    assert.equal((await call('/en/', 'HEAD')).res.status, 200);
    const { res, nextCalled } = await call('/en/', 'POST');
    assert.ok(nextCalled);
    assert.equal(await res.text(), 'next');
  });

  it('the Express server serves /en/ the same way', async () => {
    const server = app.listen(0);
    try {
      await new Promise((resolve) => server.once('listening', resolve));
      const base = `http://localhost:${server.address().port}`;
      const viaExpress = await fetch(`${base}/en/`);
      assert.equal(viaExpress.status, 200);
      assert.ok(viaExpress.headers.get('content-security-policy'));
      const { res } = await call('/en/');
      assert.equal(await viaExpress.text(), await res.text());
      const redirect = await fetch(`${base}/en?ref=linkedin`, { redirect: 'manual' });
      assert.equal(redirect.status, 301);
      assert.equal(redirect.headers.get('location'), '/en/?ref=linkedin');
    } finally {
      server.close();
    }
  });
});

describe('Pages static files', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(() => server.close());

  it('_headers sends the same CSP as the Express server', async () => {
    const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
    const line = headers.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'));
    assert.ok(line, 'public/_headers has no Content-Security-Policy');
    const pagesCsp = line.trim().slice('Content-Security-Policy:'.length).trim();

    const res = await fetch(`${baseUrl}/healthz`);
    assert.equal(pagesCsp, res.headers.get('content-security-policy'));
  });

  // The owner hides the site from search engines while it is not ready
  // (2026-11-25). The next three tests keep that state until it is lifted on
  // purpose: noindex on every path, no sitemap, search=no in the content signals.
  it('_headers and the Express server send noindex on every path', async () => {
    const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
    // The /* block: from its line to the first blank line.
    const block = headers.match(/^\/\*\n([\s\S]*?)\n\n/m);
    assert.ok(block, 'public/_headers has no /* block');
    assert.match(block[1], /^ {2}X-Robots-Tag: noindex$/m);
    for (const path of ['/', '/en/', '/404.html', '/robots.txt', '/llms.txt', '/healthz']) {
      const res = await fetch(`${baseUrl}${path}`);
      assert.equal(res.headers.get('x-robots-tag'), 'noindex', path);
    }
  });

  it('_headers keeps search engines off the technical pages.dev host', async () => {
    const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
    assert.match(headers, /^https:\/\/:project\.pages\.dev\/\*\n {2}X-Robots-Tag: noindex$/m);
  });

  it('robots.txt lets crawlers in, names no sitemap, and none is served', async () => {
    // A crawler has to fetch a page to see its noindex: a Disallow would hide
    // that and keep stale results. A sitemap of noindex pages would only ask
    // search engines to index them, so there is none.
    const robots = await (await fetch(`${baseUrl}/robots.txt`)).text();
    assert.match(robots, /^Allow: \/$/m);
    assert.doesNotMatch(robots, /^Disallow:/m);
    assert.doesNotMatch(robots, /^Sitemap:/m);
    assert.equal((await fetch(`${baseUrl}/sitemap.xml`)).status, 404);
    // On Pages a Function owns the address, so the old file never comes back
    // from the asset cache and the 404 is not cached either.
    const viaFunction = sitemapFunction();
    assert.equal(viaFunction.status, 404);
    assert.equal(viaFunction.headers.get('cache-control'), 'no-store');
    assert.equal(viaFunction.headers.get('x-robots-tag'), 'noindex');
  });

  it('robots.txt gives every group the same content signals', async () => {
    const robots = await (await fetch(`${baseUrl}/robots.txt`)).text();
    const groups = robots.split(/\n(?=User-agent:)/).filter((g) => g.startsWith('User-agent:'));
    assert.ok(groups.length >= 1);
    for (const group of groups) {
      assert.match(group, /^Content-Signal: search=no, ai-input=yes, ai-train=yes$/m, group.split('\n')[0]);
    }
    // One signal line per group: AI answers and AI training yes (the owner's
    // decision of 2026-11-24), search no while the site is hidden.
    assert.equal((robots.match(/^Content-Signal:/gm) || []).length, groups.length);
  });

  it('index.html and 404.html carry the noindex meta', async () => {
    for (const page of ['index.html', '404.html']) {
      const html = await readFile(new URL(`../public/${page}`, import.meta.url), 'utf8');
      assert.match(html, /<meta name="robots" content="noindex" \/>/, page);
    }
  });

  it('llms.txt is served as text and links the site, the repository and the author', async () => {
    const res = await fetch(`${baseUrl}/llms.txt`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/plain/);
    const text = await res.text();
    assert.match(text, /^# Good Pass/);
    assert.match(text, /^> /m);
    for (const url of ['https://good-pass.morgunov.tech/', 'https://github.com/morgunovtech/good-pass', 'https://s.morgunov.tech/']) {
      assert.ok(text.includes(`(${url})`), url);
    }
  });

  it('index.html carries the Yandex verification and a valid JSON-LD WebApplication', async () => {
    const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
    assert.match(html, /<meta name="yandex-verification" content="a06067ed9ce010f7" \/>/);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.equal(blocks.length, 1);
    const data = JSON.parse(blocks[0][1]);
    assert.equal(data['@type'], 'WebApplication');
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
    assert.equal(data.url, canonical);
    assert.equal(data.applicationCategory, 'SecurityApplication');
    assert.equal(data.isAccessibleForFree, true);
    assert.deepEqual(data.offers, { '@type': 'Offer', price: '0', priceCurrency: 'USD' });
    assert.deepEqual(data.inLanguage, ['ru', 'en']);
    assert.equal(data.sameAs, 'https://github.com/morgunovtech/good-pass');
    // The Person of s.morgunov.tech's own JSON-LD: the same @id joins the two.
    assert.equal(data.author['@id'], 'https://s.morgunov.tech/#person');
    assert.equal(data.author.url, 'https://s.morgunov.tech/');
  });

  it('index.html names its canonical address and a 1200×630 preview image', async () => {
    const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
    assert.match(html, /<link rel="canonical" href="https:\/\/good-pass\.morgunov\.tech\/" \/>/);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
    const image = html.match(/<meta property="og:image" content="https:\/\/good-pass\.morgunov\.tech\/([^"]+)"/);
    assert.ok(image, 'no og:image');
    const png = await readFile(new URL(`../public/${image[1]}`, import.meta.url));
    // PNG signature, then the IHDR chunk with the width and height.
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    assert.match(html, /<link rel="alternate" hreflang="en" href="https:\/\/good-pass\.morgunov\.tech\/en\/" \/>/);
    assert.match(html, /<link rel="alternate" hreflang="x-default" href="https:\/\/good-pass\.morgunov\.tech\/" \/>/);
  });

  it('every element the scripts look up by id is on the page', async () => {
    // generator.js looked for #generator-panel while the page has
    // #panel-generator, so the whole generator was dead from 1.1.0 to 1.2.0.
    const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
    const dir = new URL('../public/', import.meta.url);
    for (const file of (await readdir(dir)).filter((f) => f.endsWith('.js') && f !== '404.js')) {
      const js = await readFile(new URL(file, dir), 'utf8');
      for (const [, id] of js.matchAll(/getElementById\('([^']+)'\)/g)) {
        assert.match(html, new RegExp(`\\sid="${id}"`), `${file}: #${id}`);
      }
    }
  });

  for (const page of ['index.html', '404.html']) {
    it(`${page} has nothing inline that the CSP blocks`, async () => {
      const html = await readFile(new URL(`../public/${page}`, import.meta.url), 'utf8');
      assert.doesNotMatch(html, /\sstyle\s*=/i, 'inline style attribute');
      assert.doesNotMatch(html, /<style[\s>]/i, '<style> element');
      // A JSON-LD block is data, not a script: the browser never runs it, so script-src
      // does not apply to it.
      assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)(?![^>]*\stype="application\/ld\+json")[^>]*>/i, 'inline <script>');
      assert.doesNotMatch(html, /\son[a-z]+\s*=/i, 'inline event handler');
    });
  }

  // The family chrome of morgunov.tech (ds/v1/USAGE.md in about-me-page, "Service
  // chrome"): the bar with the service mark, the language and theme menus and the
  // footer are the guide's markup on both pages, styled by components.css.
  for (const page of ['index.html', '404.html']) {
    it(`${page} carries the family chrome`, async () => {
      const html = await readFile(new URL(`../public/${page}`, import.meta.url), 'utf8');
      for (const part of ['<body class="v4-page">', '<a href="#main" class="skip-link"', '<div class="v4-root">', '<header class="v4-bar"',
        '<a class="v4-service" href="https://s.morgunov.tech/">', '<div class="v4-dropdown v4-lang">', '<div class="v4-dropdown v4-theme">',
        '<main id="main"', '<footer class="v4-foot">']) {
        assert.ok(html.includes(part), part);
      }
      assert.deepEqual([...html.matchAll(/data-theme-value="([a-z-]+)"/g)].map((m) => m[1]), ['light', 'dark', 'auto', 'high-contrast']);
      assert.deepEqual([...html.matchAll(/class="v4-menu-item v4-lang-link"[^>]*data-lang="([a-z]+)"/g)].map((m) => m[1]), ['ru', 'en']);
      assert.ok(html.indexOf('v4-dropdown v4-lang') < html.indexOf('v4-dropdown v4-theme'), 'language, then theme at the edge');
      // fonts → tokens → base → components from the design system's origin, pinned by content hash.
      const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)" \/>/g)].map((m) => m[1]);
      assert.deepEqual(sheets.map((href) => href.replace(/\?v=[0-9a-f]{8}$/, '')),
        ['fonts', 'tokens', 'base', 'components'].map((name) => `https://s.morgunov.tech/ds/v1/${name}.css`).concat('/styles.css'));
      // The theme is set before the stylesheets arrive; the chrome's script is this origin's file.
      assert.ok(html.indexOf('<script src="/theme-init.js"></script>') > 0);
      assert.ok(html.indexOf('<script src="/theme-init.js"></script>') < html.indexOf('rel="stylesheet"'));
      assert.ok(html.includes('<script src="/chrome.js" defer></script>'));
    });
  }

  it('chrome.js is the design system\'s script, byte for byte', async () => {
    // A copy of https://s.morgunov.tech/ds/v1/chrome.js (the CSP allows scripts from this origin
    // only). The design system names that file by the first eight hex digits of its SHA-1; when
    // the copy is updated, this is the number to change.
    const bytes = await readFile(new URL('../public/chrome.js', import.meta.url));
    assert.equal(createHash('sha1').update(bytes).digest('hex').slice(0, 8), '57a9beca');
  });

  // The footer is the family's, to the letter: name · year · the build mark (the version, a link
  // to CHANGELOG.md on GitHub), then the privacy line, and nothing else.
  for (const page of ['index.html', '404.html']) {
    it(`${page}: the family footer with the build mark`, async () => {
      const html = await readFile(new URL(`../public/${page}`, import.meta.url), 'utf8');
      const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
      const top = /^## (\d+\.\d+\.\d+) — /m.exec(await readFile(new URL('../CHANGELOG.md', import.meta.url), 'utf8'))[1];
      assert.equal(version, top, 'package.json names the top entry of CHANGELOG.md');
      const foot = /<footer class="v4-foot">([\s\S]*?)<\/footer>/.exec(html)[1].replace(/\s+/g, ' ').trim();
      assert.equal(foot, `<span>morgunov.tech / good pass · 2026 · <a class="v4-build" href="https://github.com/morgunovtech/good-pass/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">v${version}</a></span> <span class="v4-foot-privacy" data-i18n="footer_privacy">Пароль не логируется и не хранится</span>`);
    });
  }

  it('styles.css keeps no chrome of its own', async () => {
    const css = await readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
    for (const own of [/^\.footer\b/m, /\.footer-controls/, /\.skip-nav/, /\.btn-primary/]) assert.doesNotMatch(css, own);
  });

  it('theme-init.js moves the theme saved before 1.5.0 to the family key', async () => {
    const code = await readFile(new URL('../public/theme-init.js', import.meta.url), 'utf8');
    const run = (stored) => {
      const store = new Map(Object.entries(stored));
      const attrs = {};
      const env = {
        document: { documentElement: { setAttribute: (name, value) => { attrs[name] = value; } } },
        localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) },
        window: { matchMedia: () => ({ matches: false }) }
      };
      new Function('document', 'localStorage', 'window', code)(env.document, env.localStorage, env.window);
      return { attrs, store: Object.fromEntries(store) };
    };
    assert.deepEqual(run({ 'good-pass-theme': 'dark' }), { attrs: { 'data-theme': 'dark', 'data-theme-preference': 'dark' }, store: { 'theme-preference': 'dark' } });
    assert.deepEqual(run({ 'theme-preference': 'high-contrast' }).attrs, { 'data-theme': 'high-contrast', 'data-theme-preference': 'high-contrast' });
    assert.deepEqual(run({}).attrs, { 'data-theme': 'light', 'data-theme-preference': 'auto' });
  });
});
