// Cloudflare Pages Function for /en/: public/index.html with English link-preview
// tags (src/englishPage.js). The headers from public/_headers, the CSP and
// X-Robots-Tag among them, come with the static page it rewrites.
import { englishPage } from '../../src/englishPage.js';

export async function onRequest({ request, env, next }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
  const url = new URL(request.url);
  // One address for the page: /en → /en/.
  if (url.pathname === '/en') return Response.redirect(`${url.origin}/en/${url.search}`, 301);
  const page = await env.ASSETS.fetch(new URL('/', url));
  if (!page.ok) return page;
  const headers = new Headers(page.headers);
  headers.delete('content-length');
  headers.delete('etag');
  return new Response(englishPage(await page.text()).html, { status: page.status, headers });
}
