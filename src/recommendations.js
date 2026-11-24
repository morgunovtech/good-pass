import { analyzePassword } from './passwordAnalyzer.js';
import { messagesFor } from './i18n/index.js';

const SYMBOLS = '!@#$%&*-+=?';
const DIGITS = '0123456789';

/**
 * Generate up to 3 concrete recommendations to improve the password.
 * Each recommendation includes the modified password and entropy gain; the
 * tips and the words of the examples are in the asked language.
 */
export function generateRecommendations(password, analysis, lang) {
  if (!password || analysis.entropyBits >= 90) return [];

  const { tips, words } = messagesFor(lang);
  const recs = [];

  // 1. Too short — suggest extending.
  if ([...password].length < 12) {
    const extended = password + pick(words);
    const gain = analyzePassword(extended).entropyBits - analysis.entropyBits;
    recs.push({
      tip: tips.add_word,
      example: extended,
      entropyGain: Math.max(0, Math.round(gain))
    });
  }

  // 2. Missing uppercase — capitalize a letter.
  if (!/[A-ZА-ЯЁ]/u.test(password) && /[a-zа-яё]/u.test(password)) {
    const modified = capitalizeFirst(password);
    const gain = analyzePassword(modified).entropyBits - analysis.entropyBits;
    recs.push({
      tip: tips.add_upper,
      example: modified,
      entropyGain: Math.max(0, Math.round(gain))
    });
  }

  // 3. Missing digits — append a random digit pair.
  if (!/\d/.test(password)) {
    const modified = password + randomDigits(2);
    const gain = analyzePassword(modified).entropyBits - analysis.entropyBits;
    recs.push({
      tip: tips.add_digits,
      example: modified,
      entropyGain: Math.max(0, Math.round(gain))
    });
  }

  // 4. Missing symbols — append a symbol.
  if (!/[~!@#$%^&*()\-_=+\[\]{}|;:'",.<>/?`\\]/.test(password)) {
    const modified = password + pick(SYMBOLS);
    const gain = analyzePassword(modified).entropyBits - analysis.entropyBits;
    recs.push({
      tip: tips.add_symbol,
      example: modified,
      entropyGain: Math.max(0, Math.round(gain))
    });
  }

  // 5. Common pattern — suggest a completely different approach.
  if (analysis.weaknessCodes.includes('common_pattern')) {
    const fresh = generateFreshSuggestion(words);
    const freshAnalysis = analyzePassword(fresh);
    recs.push({
      tip: tips.use_phrase,
      example: fresh,
      entropyGain: Math.max(0, Math.round(freshAnalysis.entropyBits - analysis.entropyBits))
    });
  }

  // Deduplicate and limit to 3.
  const seen = new Set();
  return recs
    .filter((r) => {
      if (seen.has(r.example)) return false;
      seen.add(r.example);
      return true;
    })
    .slice(0, 3);
}

function capitalizeFirst(str) {
  const chars = [...str];
  for (let i = 0; i < chars.length; i++) {
    if (/[a-zа-яё]/u.test(chars[i])) {
      chars[i] = chars[i].toUpperCase();
      return chars.join('');
    }
  }
  return str;
}

function randomDigits(n) {
  return Array.from({ length: n }, () => DIGITS[Math.floor(Math.random() * 10)]).join('');
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function generateFreshSuggestion(words) {
  const w1 = pick(words);
  const w2 = pick(words);
  const sym = pick(SYMBOLS);
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${w1}-${w2}${sym}${num}`;
}
