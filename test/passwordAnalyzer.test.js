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
import { DICEWARE_WORD_COUNT } from '../public/dicewareWords.js';

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
    assert.ok(charset >= 10 + 32 + 100);
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

  it('computes entropy for mixed printable set using H = L * log2(S)', () => {
    const password = 'Aa1!Bb2@Cc';
    const charsetSize = calculateCharsetSize(password);
    const result = analyzePassword(password, { attackProfile: 'offline', hashProfile: 'md5' });
    const expected = password.length * Math.log2(charsetSize);
    assert.ok(Math.abs(result.entropyBits - expected) < 0.01);
  });

  it('computes entropy for diceware-like passphrases with actual wordlist size', () => {
    const result = analyzePassword('luna-bora-fera-meko', { attackProfile: 'offline', hashProfile: 'argon2id' });
    const expected = 4 * Math.log2(DICEWARE_WORD_COUNT);
    assert.ok(Math.abs(result.passphrase.totalEntropy - expected) < 0.01);
  });

  it('increases entropy as length or words grow', () => {
    const shorter = analyzePassword('LongerPass1!', { attackProfile: 'offline', hashProfile: 'md5' });
    const longer = analyzePassword('LongerPass1!Extra', { attackProfile: 'offline', hashProfile: 'md5' });
    assert.ok(longer.entropyBits > shorter.entropyBits);

    const fewWords = analyzePassword('luna bora fera', { attackProfile: 'offline', hashProfile: 'md5' });
    const moreWords = analyzePassword('luna bora fera meko noro', {
      attackProfile: 'offline',
      hashProfile: 'md5'
    });
    assert.ok(moreWords.passphrase.totalEntropy > fewWords.passphrase.totalEntropy);
  });
});
