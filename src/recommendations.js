import { analyzePassword } from './passwordAnalyzer.js';

const SYMBOLS = '!@#$%&*-+=?';
const DIGITS = '0123456789';

/**
 * Generate up to 3 concrete recommendations to improve the password.
 * Each recommendation includes the modified password and entropy gain.
 */
export function generateRecommendations(password, analysis) {
  if (!password || analysis.entropyBits >= 90) return [];

  const recs = [];

  // 1. Too short — suggest extending.
  if ([...password].length < 12) {
    const extended = password + randomWord();
    const gain = analyzePassword(extended).entropyBits - analysis.entropyBits;
    recs.push({
      tip: 'Добавьте ещё одно слово для увеличения длины.',
      example: extended,
      entropyGain: Math.max(0, Math.round(gain))
    });
  }

  // 2. Missing uppercase — capitalize a letter.
  if (!/[A-ZА-ЯЁ]/u.test(password) && /[a-zа-яё]/u.test(password)) {
    const modified = capitalizeFirst(password);
    const gain = analyzePassword(modified).entropyBits - analysis.entropyBits;
    recs.push({
      tip: 'Добавьте заглавную букву.',
      example: modified,
      entropyGain: Math.max(0, Math.round(gain))
    });
  }

  // 3. Missing digits — append a random digit pair.
  if (!/\d/.test(password)) {
    const modified = password + randomDigits(2);
    const gain = analyzePassword(modified).entropyBits - analysis.entropyBits;
    recs.push({
      tip: 'Добавьте пару цифр.',
      example: modified,
      entropyGain: Math.max(0, Math.round(gain))
    });
  }

  // 4. Missing symbols — append a symbol.
  if (!/[~!@#$%^&*()\-_=+\[\]{}|;:'",.<>/?`\\]/.test(password)) {
    const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const modified = password + sym;
    const gain = analyzePassword(modified).entropyBits - analysis.entropyBits;
    recs.push({
      tip: 'Добавьте спецсимвол для роста энтропии.',
      example: modified,
      entropyGain: Math.max(0, Math.round(gain))
    });
  }

  // 5. Common pattern — suggest a completely different approach.
  if (analysis.weaknesses.some((w) => w.includes('популярный шаблон'))) {
    const fresh = generateFreshSuggestion();
    const freshAnalysis = analyzePassword(fresh);
    recs.push({
      tip: 'Пароль содержит известный шаблон. Попробуйте фразу:',
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

const WORDS = ['Вершина', 'Маяк', 'Кедр', 'Рассвет', 'Бриз', 'Якорь', 'Парус', 'Комета'];

function randomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function generateFreshSuggestion() {
  const w1 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const w2 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${w1}-${w2}${sym}${num}`;
}
