// There is no sitemap while the site is not indexed (1.4.3). A Function answers
// the old address instead of a plain missing file because Cloudflare Pages kept
// serving the deleted sitemap from its asset cache for the week the old
// `_headers` rule allowed (s-maxage=604800); a zone purge does not reach that
// layer, a Function bypasses it. The answer is a 404 at once and is never
// cached. Delete this file when the sitemap comes back (1.4.3 lists the rest).
export function onRequest() {
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
