import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { generateRecommendations } from '../src/recommendations.js';
import { analyzePassword } from '../src/passwordAnalyzer.js';

describe('recommendations', () => {
  it('generates recommendations for weak passwords', () => {
    const analysis = analyzePassword('hello');
    const recs = generateRecommendations('hello', analysis);
    assert.ok(recs.length > 0);
    assert.ok(recs.length <= 3);
  });

  it('each recommendation has required fields', () => {
    const analysis = analyzePassword('test');
    const recs = generateRecommendations('test', analysis);
    for (const rec of recs) {
      assert.ok(rec.tip);
      assert.ok(rec.example);
      assert.equal(typeof rec.entropyGain, 'number');
      assert.ok(rec.entropyGain >= 0);
    }
  });

  it('returns empty array for very strong passwords', () => {
    const pw = 'X$k9Lm!2qW@7nRtP-ZvBc3Fg8Jh';
    const analysis = analyzePassword(pw);
    const recs = generateRecommendations(pw, analysis);
    assert.equal(recs.length, 0);
  });

  it('suggests a fresh approach for common patterns', () => {
    const analysis = analyzePassword('password');
    const recs = generateRecommendations('password', analysis);
    // Should suggest something — either a fresh passphrase or other improvements.
    assert.ok(recs.length > 0);
    assert.ok(recs.some((r) => r.tip.includes('шаблон') || r.tip.includes('фразу') || r.tip.includes('длин') || r.tip.includes('заглавн')));
  });

  it('suggests adding uppercase when missing', () => {
    const analysis = analyzePassword('abcdefgh');
    const recs = generateRecommendations('abcdefgh', analysis);
    assert.ok(recs.some((r) => r.tip.includes('заглавную') || r.tip.includes('длин')));
  });

  it('suggests adding digits when missing', () => {
    const analysis = analyzePassword('OnlyLetters!');
    const recs = generateRecommendations('OnlyLetters!', analysis);
    assert.ok(recs.some((r) => r.tip.includes('цифр')));
  });

  it('suggests adding symbols when missing', () => {
    const analysis = analyzePassword('OnlyLetters123');
    const recs = generateRecommendations('OnlyLetters123', analysis);
    assert.ok(recs.some((r) => r.tip.includes('спецсимвол') || r.tip.includes('Спецсимвол')));
  });

  it('returns max 3 recommendations', () => {
    const analysis = analyzePassword('aa');
    const recs = generateRecommendations('aa', analysis);
    assert.ok(recs.length <= 3);
  });
});
