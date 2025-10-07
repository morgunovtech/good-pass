import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzePassword,
  calculateCharsetSize,
  estimateBruteForceSeconds,
  formatDuration,
  GUESS_RATE_PER_SECOND
} from '../src/passwordAnalyzer.js';

describe('password analyzer', () => {
  it('marks obviously weak passwords as very weak with actionable feedback', () => {
    const result = analyzePassword('aaaa');

    assert.equal(result.scoreLabel, 'Очень слабый');
    assert.ok(result.weaknesses.some((item) => item.includes('Повторяющиеся')));
    assert.ok(result.weaknesses.some((item) => item.includes('Низкая энтропия')));
    assert.equal(result.strengths.length, 0);
  });

  it('recognises long mixed passwords as strong', () => {
    const result = analyzePassword('Гроза-Моря#2045Правда');

    assert.ok(['Сильный', 'Отличный'].includes(result.scoreLabel));
    assert.ok(result.strengths.length >= 2);
    assert.ok(result.entropyBits > 70);
  });

  it('respects unicode and symbol contributions in charset size', () => {
    const charset = calculateCharsetSize('Åßç∂1!');
    assert.ok(charset >= 10 + 33 + 100);
  });

  it('estimates cracking time using configured guess rate', () => {
    const entropy = 60; // bits
    const seconds = estimateBruteForceSeconds(entropy);
    const expected = Math.pow(2, entropy) / GUESS_RATE_PER_SECOND;
    assert.ok(Math.abs(seconds - expected) < expected * 0.0001);
  });

  it('formats long durations and handles infinities gracefully', () => {
    assert.equal(formatDuration(0.5), 'Мгновенно');
    assert.equal(formatDuration(65), '1 минута и 5 секунд');
    assert.equal(formatDuration(Number.POSITIVE_INFINITY), 'Практически не поддаётся перебору');
  });
});
