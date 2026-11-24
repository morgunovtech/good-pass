import { analyzePassword } from './passwordAnalyzer.js';
import { generateRecommendations } from './recommendations.js';
import { fetchBreachRange } from './breachCheck.js';
import { langFromAcceptLanguage, messagesFor, resolveLang } from './i18n/index.js';
import { log } from './log.js';

// The API is served twice: by Express in src/server.js (local dev, tests) and
// by Cloudflare Pages Functions in functions/api/v1/ (production). Both call
// these handlers: each takes the parsed JSON body and returns { status, body }.
// The texts follow the body's "lang" ("ru" by default, or "en").

// Same as express.json({ limit: '5kb' }) in src/server.js.
const BODY_LIMIT_BYTES = 5 * 1024;

// --- Password analysis ---
export function handleAnalyze(input) {
  const { password, lang: asked } = input ?? {};
  const lang = resolveLang(asked);
  const m = messagesFor(lang);

  try {
    if (typeof password !== 'string') {
      log('warn', 'invalid_input', { reason: 'non-string password' });
      return { status: 400, body: { error: m.errors.not_string } };
    }

    if (password.length === 0) {
      log('info', 'empty_password', {});
      return {
        status: 200,
        body: {
          scoreLabel: m.score.empty,
          entropyBits: 0,
          estimatedTime: m.time.instant,
          estimatedSeconds: 0,
          strengths: [],
          weaknesses: [m.weaknesses.empty],
          score: 'empty',
          weaknessCodes: ['empty'],
          recommendations: []
        }
      };
    }

    if ([...password].length > 128) {
      return { status: 400, body: { error: m.errors.too_long } };
    }

    const analysis = analyzePassword(password, lang);
    const recommendations = generateRecommendations(password, analysis, lang);

    log('info', 'password_analyzed', {
      length: password.length,
      entropy: analysis.entropyBits,
      score: analysis.score,
      lang
    });

    return { status: 200, body: { ...analysis, recommendations } };
  } catch (err) {
    log('error', 'analyze_error', { message: err?.message ?? 'unknown' });
    return { status: 500, body: { error: m.errors.internal } };
  }
}

// --- Breach check (HIBP k-anonymity proxy) ---
// Only the first 5 hex characters of the SHA-1 reach the server and HIBP; the
// browser compares the returned suffixes itself.
export async function handleBreachCheck(input) {
  const { hashPrefix, lang } = input ?? {};
  try {
    if (typeof hashPrefix !== 'string' || !/^[0-9a-fA-F]{5}$/.test(hashPrefix)) {
      // A message for developers, the same in every language.
      return { status: 400, body: { error: 'hashPrefix must be exactly 5 hex characters.' } };
    }

    const suffixes = await fetchBreachRange(hashPrefix);
    return { status: 200, body: { suffixes } };
  } catch (err) {
    log('error', 'breach_check_error', { message: err?.message ?? 'unknown' });
    return { status: 200, body: { suffixes: [], error: messagesFor(lang).errors.breach_unavailable } };
  }
}

/**
 * Wrap a handler as a Pages Function (`onRequestPost`). The body is read the
 * way express.json() reads it: JSON content type only, otherwise an empty body.
 */
export function pagesFunction(handler) {
  return async ({ request }) => {
    let input = {};

    if ((request.headers.get('content-type') ?? '').includes('application/json')) {
      // The body is unread here, so its "lang" is too: Accept-Language decides.
      const bodyError = (status, key) => Response.json(
        { error: messagesFor(langFromAcceptLanguage(request.headers.get('accept-language'))).errors[key] },
        { status }
      );
      if (Number(request.headers.get('content-length')) > BODY_LIMIT_BYTES) {
        return bodyError(413, 'too_large');
      }
      const raw = await request.arrayBuffer();
      if (raw.byteLength > BODY_LIMIT_BYTES) {
        return bodyError(413, 'too_large');
      }
      try {
        input = JSON.parse(new TextDecoder().decode(raw));
      } catch {
        return bodyError(400, 'bad_json');
      }
    }

    const { status, body } = await handler(input);
    return Response.json(body, { status });
  };
}
