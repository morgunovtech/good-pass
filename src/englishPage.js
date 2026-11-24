// The English page at /en/: public/index.html with its <head> tags rewritten in
// English. LinkedIn, Telegram and other link previews read the og: tags without
// running the page's scripts, and index.html carries the Russian ones. Served by
// the Pages Function in functions/en/index.js and, locally, by src/server.js;
// the page picks English from the address (pickLang in public/i18n.js).
// test/pages.test.js fails when a tag this rewrites is no longer in index.html.

const SITE = 'https://good-pass.morgunov.tech';

export const EN = {
  // The same as "meta_title" in public/locales/en.json, which the page sets itself.
  title: 'Good Pass — password strength check',
  description:
    'Explains password strength: entropy, crack time, a k-anonymous breach check, a generator and a memory trainer.',
  imageAlt: 'Good Pass — password strength check'
};

const attr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// [what, the tag in public/index.html, the tag on /en/]
const REWRITES = [
  ['html lang', /<html lang="ru" data-theme="auto">/, '<html lang="en" data-theme="auto">'],
  ['title', /<title data-i18n="meta_title">[^<]*<\/title>/, `<title data-i18n="meta_title">${attr(EN.title)}</title>`],
  ['description', /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${attr(EN.description)}" />`],
  ['canonical', /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${SITE}/en/" />`],
  ['og:title', /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${attr(EN.title)}" />`],
  ['og:description', /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${attr(EN.description)}" />`],
  ['og:url', /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${SITE}/en/" />`],
  ['og:image', /<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${SITE}/og-image-en.png" />`],
  ['og:image:alt', /<meta property="og:image:alt" content="[^"]*" \/>/, `<meta property="og:image:alt" content="${attr(EN.imageAlt)}" />`],
  ['og:locale', /<meta property="og:locale" content="ru_RU" \/>/, '<meta property="og:locale" content="en_US" />'],
  ['og:locale:alternate', /<meta property="og:locale:alternate" content="en_US" \/>/, '<meta property="og:locale:alternate" content="ru_RU" />']
];

/** The page with the English tags, and the names of the tags it could not find. */
export function englishPage(html) {
  const missing = [];
  let out = html;
  for (const [name, pattern, tag] of REWRITES) {
    if (pattern.test(out)) out = out.replace(pattern, () => tag);
    else missing.push(name);
  }
  return { html: out, missing };
}
