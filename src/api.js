import { analyzePassword } from './passwordAnalyzer.js';
import { generateRecommendations } from './recommendations.js';
import { fetchBreachRange } from './breachCheck.js';
import { log } from './log.js';

// The API is served twice: by Express in src/server.js (local dev, tests) and
// by Cloudflare Pages Functions in functions/api/v1/ (production). Both call
// these handlers: each takes the parsed JSON body and returns { status, body }.

// Same as express.json({ limit: '5kb' }) in src/server.js.
const BODY_LIMIT_BYTES = 5 * 1024;

// --- Password analysis ---
export function handleAnalyze(input) {
  try {
    const { password } = input ?? {};

    if (typeof password !== 'string') {
      log('warn', 'invalid_input', { reason: 'non-string password' });
      return { status: 400, body: { error: 'Пароль должен быть строкой.' } };
    }

    if (password.length === 0) {
      log('info', 'empty_password', {});
      return {
        status: 200,
        body: {
          scoreLabel: 'Пусто',
          entropyBits: 0,
          estimatedTime: 'Мгновенно',
          estimatedSeconds: 0,
          strengths: [],
          weaknesses: ['Введите хотя бы один символ.'],
          recommendations: []
        }
      };
    }

    if ([...password].length > 128) {
      return { status: 400, body: { error: 'Пароль слишком длинный. Максимум 128 символов.' } };
    }

    const analysis = analyzePassword(password);
    const recommendations = generateRecommendations(password, analysis);

    log('info', 'password_analyzed', {
      length: password.length,
      entropy: analysis.entropyBits,
      score: analysis.scoreLabel
    });

    return { status: 200, body: { ...analysis, recommendations } };
  } catch (err) {
    log('error', 'analyze_error', { message: err?.message ?? 'unknown' });
    return { status: 500, body: { error: 'Что-то пошло не так. Попробуйте снова позже.' } };
  }
}

// --- Breach check (HIBP k-anonymity proxy) ---
// Only the first 5 hex characters of the SHA-1 reach the server and HIBP; the
// browser compares the returned suffixes itself.
export async function handleBreachCheck(input) {
  try {
    const { hashPrefix } = input ?? {};

    if (typeof hashPrefix !== 'string' || !/^[0-9a-fA-F]{5}$/.test(hashPrefix)) {
      return { status: 400, body: { error: 'hashPrefix must be exactly 5 hex characters.' } };
    }

    const suffixes = await fetchBreachRange(hashPrefix);
    return { status: 200, body: { suffixes } };
  } catch (err) {
    log('error', 'breach_check_error', { message: err?.message ?? 'unknown' });
    return { status: 200, body: { suffixes: [], error: 'Проверка утечек временно недоступна.' } };
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
      if (Number(request.headers.get('content-length')) > BODY_LIMIT_BYTES) {
        return Response.json({ error: 'Слишком большой запрос.' }, { status: 413 });
      }
      const raw = await request.arrayBuffer();
      if (raw.byteLength > BODY_LIMIT_BYTES) {
        return Response.json({ error: 'Слишком большой запрос.' }, { status: 413 });
      }
      try {
        input = JSON.parse(new TextDecoder().decode(raw));
      } catch {
        return Response.json({ error: 'Некорректный JSON.' }, { status: 400 });
      }
    }

    const { status, body } = await handler(input);
    return Response.json(body, { status });
  };
}
