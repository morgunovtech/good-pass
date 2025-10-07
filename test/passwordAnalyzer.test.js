import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzePassword,
  calculateCharsetSize,
  estimateBruteForceSeconds,
  formatDuration,
  ATTACK_PROFILES,
  HASH_PROFILES
} from '../public/passwordAnalyzer.js';

describe('password analyzer', () => {
  it('marks obviously weak passwords as very weak with actionable feedback', () => {
    const result = analyzePassword('aaaa', { attackProfile: 'online', hashProfile: 'md5' });

    assert.equal(result.scoreLabel, 'Очень слабый');
    assert.ok(result.weaknesses.some((item) => item.includes('Повторяющиеся')));
    assert.ok(result.detectors.personalData.flagged === false);
  });

  it('recognises long mixed passwords as strong and highlights passphrases', () => {
    const result = analyzePassword('Luna-bora-fera-meko', { attackProfile: 'offline', hashProfile: 'argon2id' });

    assert.ok(['Сильный', 'Отличный'].includes(result.scoreLabel));
    assert.ok(result.passphrase.looksLikeDiceware);
    assert.equal(result.passphrase.wordCount, 4);
    assert.ok(result.passphrase.totalEntropy > 40);
  });

  it('detects layout-based dictionary patterns', () => {
    const result = analyzePassword('Ghbdtn2024', { attackProfile: 'online', hashProfile: 'sha256' });

    assert.ok(result.patternMatches.some((item) => item.includes('раскладке')));
    assert.ok(result.detectors.layout.flagged);
  });

  it('flags personal data and keyboard walks', () => {
    const result = analyzePassword('Ivan1988qwerty', { attackProfile: 'offline', hashProfile: 'md5' });

    assert.ok(result.detectors.personalData.flagged);
    assert.ok(result.detectors.keyboardWalk.flagged);
  });

  it('respects unicode and symbol contributions in charset size', () => {
    const charset = calculateCharsetSize('Åßç∂1!');
    assert.ok(charset >= 10 + 33 + 100);
  });

  it('estimates cracking time using configured guess rate', () => {
    const entropy = 60; // bits
    const offline = ATTACK_PROFILES.find((item) => item.id === 'offline');
    const md5 = HASH_PROFILES.find((item) => item.id === 'md5');
    const rate = offline.baseGuessRate / md5.slowdown;

    const seconds = estimateBruteForceSeconds(entropy, rate);
    const expected = Math.pow(2, entropy) / rate;
    assert.ok(Math.abs(seconds - expected) < expected * 0.0001);
  });

  it('formats long durations and handles infinities gracefully', () => {
    assert.equal(formatDuration(0.5), 'Мгновенно');
    assert.equal(formatDuration(65), '1 минута и 5 секунд');
    assert.equal(formatDuration(Number.POSITIVE_INFINITY), 'Практически не поддаётся перебору');
  });
});
