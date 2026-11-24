import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// public/sw.js run in a sandbox that stands in for a service worker on
// good-pass.pages.dev: the test sees which requests the worker answers.
async function loadWorker() {
  const handlers = {};
  const fetched = [];
  const sandbox = {
    self: {
      location: { origin: 'https://good-pass.pages.dev' },
      addEventListener: (type, handler) => { handlers[type] = handler; },
      skipWaiting() {},
      clients: { claim() {} }
    },
    caches: { match: async () => undefined },
    fetch: async (request) => {
      fetched.push(request.url);
      return new Response('ok');
    },
    URL,
    Response,
    JSON
  };
  vm.runInNewContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return { handlers, fetched };
}

function fetchEvent(url) {
  return {
    request: { url, method: 'GET' },
    responses: [],
    respondWith(response) { this.responses.push(response); }
  };
}

describe('service worker (public/sw.js)', () => {
  it('leaves other origins to the browser', async () => {
    // Its own fetch() to them is blocked by the worker's CSP (connect-src
    // 'self'), which used to strip the page of the design system's styles.
    const { handlers, fetched } = await loadWorker();
    for (const url of [
      'https://s.morgunov.tech/ds/v1/tokens.css?v=fa7fc139',
      'https://s.morgunov.tech/ds/v1/fonts/IBMPlexSans-Regular.woff2'
    ]) {
      const event = fetchEvent(url);
      handlers.fetch(event);
      assert.equal(event.responses.length, 0, url);
    }
    assert.deepEqual(fetched, []);
  });

  it('answers its own static files and API calls', async () => {
    const { handlers, fetched } = await loadWorker();
    for (const path of ['/', '/app.js', '/locales/en.json', '/api/v1/analyze']) {
      const event = fetchEvent(`https://good-pass.pages.dev${path}`);
      handlers.fetch(event);
      assert.equal(event.responses.length, 1, path);
      assert.equal(await (await event.responses[0]).text(), 'ok');
    }
    assert.equal(fetched.length, 4);
  });
});
