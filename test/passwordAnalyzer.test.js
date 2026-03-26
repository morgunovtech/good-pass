import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzePassword,
  calculateCharsetSize,
  estimateBruteForceSeconds,
  formatDuration,
  pluralize,
  GUESS_RATE_PER_SECOND
} from '../src/passwordAnalyzer.js';

// --------------- analyzePassword ---------------

describe('analyzePassword', () => {
  it('marks obviously weak passwords as very weak with actionable feedback', () => {
    const result = analyzePassword('aaaa');
    assert.equal(result.scoreLabel, 'Очень слабый');
    assert.ok(result.weaknesses.some((w) => w.includes('Повторяющиеся')));
    assert.equal(result.strengths.length, 0);
  });

  it('recognises long mixed passwords as strong', () => {
    const result = analyzePassword('Гроза-Моря#2045Правда');
    assert.ok(['Сильный', 'Отличный'].includes(result.scoreLabel));
    assert.ok(result.strengths.length >= 2);
  });

  it('handles empty string', () => {
    const result = analyzePassword('');
    assert.equal(result.entropyBits, 0);
    assert.equal(result.estimatedSeconds, 0);
  });

  it('handles null/undefined input', () => {
    const result = analyzePassword(null);
    assert.equal(result.entropyBits, 0);
    assert.equal(result.scoreLabel, 'Очень слабый');
  });

  it('handles single character', () => {
    const result = analyzePassword('a');
    assert.equal(result.scoreLabel, 'Очень слабый');
    assert.ok(result.weaknesses.some((w) => w.includes('Меньше 8')));
  });

  it('detects l33t-speak variants of common passwords', () => {
    const result = analyzePassword('p@$$w0rd');
    assert.ok(result.weaknesses.some((w) => w.includes('популярный шаблон')));
  });

  it('detects Russian keyboard patterns', () => {
    const result = analyzePassword('йцукен123');
    assert.ok(result.weaknesses.some((w) => w.includes('клавиатурные дорожки')));
  });

  it('handles emoji correctly without crashing', () => {
    const result = analyzePassword('🔐SecurePass1!');
    assert.ok(result.entropyBits > 0);
    assert.ok(result.scoreLabel);
  });

  it('penalises repetitive patterns like abcabcabc', () => {
    const plain = analyzePassword('abcabcabc');
    const mixed = analyzePassword('xJ7kQ9mR2');
    // Repetitive password should have lower effective entropy than a random one of same length.
    assert.ok(plain.entropyBits < mixed.entropyBits);
  });

  it('returns estimatedSeconds as a number', () => {
    const result = analyzePassword('SomePassword123!');
    assert.equal(typeof result.estimatedSeconds, 'number');
  });
});

// --------------- calculateCharsetSize ---------------

describe('calculateCharsetSize', () => {
  it('returns 26 for lowercase only', () => {
    assert.equal(calculateCharsetSize('abc'), 26);
  });

  it('returns 52 for mixed case', () => {
    assert.equal(calculateCharsetSize('aBc'), 52);
  });

  it('returns 36 for lowercase + digits', () => {
    assert.equal(calculateCharsetSize('abc1'), 36);
  });

  it('includes symbols correctly', () => {
    assert.equal(calculateCharsetSize('a!'), 26 + 33);
  });

  it('includes space', () => {
    assert.equal(calculateCharsetSize('a b'), 26 + 1);
  });

  it('handles Cyrillic as 66 (not 100)', () => {
    const size = calculateCharsetSize('Привет');
    assert.equal(size, 66);
  });

  it('respects unicode and symbol contributions', () => {
    const charset = calculateCharsetSize('Aßç1!');
    // Upper(26) + digits(10) + symbols(33) + otherUnicode(100)
    assert.ok(charset >= 10 + 33 + 100);
  });

  it('falls back to unique char count for unknown charset', () => {
    // Control characters only — none match known categories except fallback.
    const size = calculateCharsetSize('\x01\x02\x03');
    assert.equal(size, 3);
  });
});

// --------------- estimateBruteForceSeconds ---------------

describe('estimateBruteForceSeconds', () => {
  it('returns 0 for zero entropy', () => {
    assert.equal(estimateBruteForceSeconds(0), 0);
  });

  it('returns 0 for negative entropy', () => {
    assert.equal(estimateBruteForceSeconds(-10), 0);
  });

  it('returns Infinity for very high entropy', () => {
    assert.equal(estimateBruteForceSeconds(9999), Number.POSITIVE_INFINITY);
  });

  it('estimates cracking time using configured guess rate', () => {
    const entropy = 60;
    const seconds = estimateBruteForceSeconds(entropy);
    const expected = Math.pow(2, entropy) / GUESS_RATE_PER_SECOND;
    assert.ok(Math.abs(seconds - expected) < expected * 0.0001);
  });

  it('handles NaN gracefully', () => {
    assert.equal(estimateBruteForceSeconds(NaN), 0);
  });

  it('handles Infinity input', () => {
    assert.equal(estimateBruteForceSeconds(Infinity), 0);
  });
});

// --------------- formatDuration ---------------

describe('formatDuration', () => {
  it('returns Мгновенно for sub-second', () => {
    assert.equal(formatDuration(0.5), 'Мгновенно');
  });

  it('returns Мгновенно for exactly 1 second', () => {
    assert.equal(formatDuration(1), 'Мгновенно');
  });

  it('formats minutes and seconds', () => {
    assert.equal(formatDuration(65), '1 минута и 5 секунд');
  });

  it('formats hours', () => {
    const result = formatDuration(3700);
    assert.ok(result.includes('час'));
  });

  it('formats days and hours', () => {
    const result = formatDuration(90_000);
    assert.ok(result.includes('день') || result.includes('дня') || result.includes('дней'));
  });

  it('formats years', () => {
    const result = formatDuration(100_000_000);
    assert.ok(result.includes('год') || result.includes('года') || result.includes('лет'));
  });

  it('handles Infinity', () => {
    assert.equal(formatDuration(Number.POSITIVE_INFINITY), 'Практически не поддаётся перебору');
  });

  it('handles very large numbers (> 1e18)', () => {
    assert.equal(formatDuration(2e18), 'Практически не поддаётся перебору');
  });

  it('handles NaN', () => {
    assert.equal(formatDuration(NaN), 'Практически не поддаётся перебору');
  });

  it('limits output to two units', () => {
    const result = formatDuration(31_536_000 + 86_400 + 3_600 + 61);
    const parts = result.split(' и ');
    assert.equal(parts.length, 2);
  });
});

// --------------- pluralize ---------------

describe('pluralize', () => {
  const forms = { one: 'год', few: 'года', many: 'лет' };

  it('returns one for 1', () => {
    assert.equal(pluralize(1, forms), 'год');
  });

  it('returns few for 2-4', () => {
    assert.equal(pluralize(2, forms), 'года');
    assert.equal(pluralize(3, forms), 'года');
    assert.equal(pluralize(4, forms), 'года');
  });

  it('returns many for 5-10', () => {
    assert.equal(pluralize(5, forms), 'лет');
    assert.equal(pluralize(10, forms), 'лет');
  });

  it('returns many for 11-14 (special case)', () => {
    assert.equal(pluralize(11, forms), 'лет');
    assert.equal(pluralize(12, forms), 'лет');
    assert.equal(pluralize(13, forms), 'лет');
    assert.equal(pluralize(14, forms), 'лет');
  });

  it('returns one for 21', () => {
    assert.equal(pluralize(21, forms), 'год');
  });

  it('returns few for 22-24', () => {
    assert.equal(pluralize(22, forms), 'года');
  });

  it('returns many for 111-114', () => {
    assert.equal(pluralize(111, forms), 'лет');
    assert.equal(pluralize(112, forms), 'лет');
  });

  it('returns one for 101', () => {
    assert.equal(pluralize(101, forms), 'год');
  });

  it('handles 0', () => {
    assert.equal(pluralize(0, forms), 'лет');
  });
});

// --------------- weakness detection ---------------

describe('weakness detection', () => {
  it('flags passwords shorter than 8 chars', () => {
    const r = analyzePassword('Abc1!');
    assert.ok(r.weaknesses.some((w) => w.includes('Меньше 8')));
  });

  it('suggests 12+ chars for 8-11 length passwords', () => {
    const r = analyzePassword('Abcdefg1!');
    assert.ok(r.weaknesses.some((w) => w.includes('12+')));
  });

  it('detects all-same-character passwords', () => {
    const r = analyzePassword('aaaaaaaaaa');
    assert.ok(r.weaknesses.some((w) => w.includes('Повторяющиеся')));
  });

  it('detects common patterns', () => {
    const r = analyzePassword('mypassword123');
    assert.ok(r.weaknesses.some((w) => w.includes('популярный шаблон')));
  });

  it('detects numeric sequences', () => {
    const r = analyzePassword('hello12345');
    assert.ok(r.weaknesses.some((w) => w.includes('Последовательности')));
  });

  it('detects keyboard patterns', () => {
    const r = analyzePassword('qwertyTest1');
    assert.ok(r.weaknesses.some((w) => w.includes('клавиатурные')));
  });

  it('detects date patterns (YYYY)', () => {
    const r = analyzePassword('birthday1990!A');
    assert.ok(r.weaknesses.some((w) => w.includes('Годы рождения')));
  });

  it('detects date patterns (DD.MM.YYYY)', () => {
    const r = analyzePassword('pass15.03.1990abc');
    assert.ok(r.weaknesses.some((w) => w.includes('Годы рождения') || w.includes('даты')));
  });

  it('flags missing letters', () => {
    const r = analyzePassword('123456789!@#');
    assert.ok(r.weaknesses.some((w) => w.includes('буквы')));
  });

  it('flags missing digits', () => {
    const r = analyzePassword('OnlyLetters!');
    assert.ok(r.weaknesses.some((w) => w.includes('Цифры')));
  });

  it('flags missing symbols', () => {
    const r = analyzePassword('OnlyLetters123');
    assert.ok(r.weaknesses.some((w) => w.includes('Спецсимволы')));
  });

  it('detects Russian common passwords', () => {
    const r = analyzePassword('пароль');
    assert.ok(r.weaknesses.some((w) => w.includes('популярный шаблон')));
  });
});

// --------------- strength detection ---------------

describe('strength detection', () => {
  it('recognises length >= 16 as very long', () => {
    const r = analyzePassword('ThisIsAVeryLong!Pass1');
    assert.ok(r.strengths.some((s) => s.includes('Очень длинный')));
  });

  it('recognises length 12-15 as good', () => {
    const r = analyzePassword('GoodPass12!x');
    assert.ok(r.strengths.some((s) => s.includes('12+')));
  });

  it('recognises mixed case', () => {
    const r = analyzePassword('AaBbCcDdEeFfGg1!');
    assert.ok(r.strengths.some((s) => s.includes('регистр')));
  });

  it('recognises special characters', () => {
    const r = analyzePassword('TestPassword1!xyz');
    assert.ok(r.strengths.some((s) => s.includes('Спецсимволы')));
  });

  it('recognises high entropy', () => {
    const r = analyzePassword('X$k9Lm!2qW@7nRtP');
    assert.ok(r.strengths.some((s) => s.includes('энтропия')));
  });
});
