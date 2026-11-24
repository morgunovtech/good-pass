import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

import { pickLang, pathForLang } from '../public/i18n.js';
import { WORDLISTS, MNEMONIC_ACTIONS } from '../public/wordlists.js';
import ruApi from '../src/i18n/ru.js';
import enApi from '../src/i18n/en.js';
import { resolveLang, langFromAcceptLanguage } from '../src/i18n/index.js';
import { analyzePassword, formatDuration } from '../src/passwordAnalyzer.js';
import { generateRecommendations } from '../src/recommendations.js';

const CYRILLIC = /[а-яё]/i;
const publicFile = (name) => readFile(new URL(`../public/${name}`, import.meta.url), 'utf8');
const locales = {
  ru: JSON.parse(await publicFile('locales/ru.json')),
  en: JSON.parse(await publicFile('locales/en.json'))
};

// Every string inside a nested dictionary, with its path.
function leaves(value, path = '') {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe('interface language pick (public/i18n.js)', () => {
  it('a saved choice wins over the browser language', () => {
    assert.equal(pickLang('ru', 'en-US'), 'ru');
    assert.equal(pickLang('en', 'ru-RU'), 'en');
  });

  it('without a saved choice an English browser gets English', () => {
    assert.equal(pickLang(null, 'en-GB'), 'en');
    assert.equal(pickLang(null, 'EN'), 'en');
  });

  it('everything else gets Russian', () => {
    assert.equal(pickLang(null, 'ru-RU'), 'ru');
    assert.equal(pickLang(null, 'de-DE'), 'ru');
    assert.equal(pickLang(null, undefined), 'ru');
    assert.equal(pickLang('fr', 'de'), 'ru');
  });

  it('an unknown saved value falls through to the browser language', () => {
    assert.equal(pickLang('fr', 'en-US'), 'en');
  });

  it('/en/ is English whatever was saved', () => {
    assert.equal(pickLang('ru', 'ru-RU', '/en/'), 'en');
    assert.equal(pickLang('ru', 'ru-RU', '/en'), 'en');
    assert.equal(pickLang('ru', 'en-US', '/'), 'ru');
    assert.equal(pickLang(null, 'ru-RU', '/english/'), 'ru');
  });

  it('a switch moves the address between / and /en/ only', () => {
    assert.equal(pathForLang('/en/', 'ru'), '/');
    assert.equal(pathForLang('/', 'en'), '/en/');
    assert.equal(pathForLang('/en/', 'en'), null);
    assert.equal(pathForLang('/', 'ru'), null);
    assert.equal(pathForLang('/index.html', 'en'), null);
  });
});

describe('interface strings (public/locales/)', () => {
  it('ru and en have the same keys', () => {
    assert.deepEqual(Object.keys(locales.en).sort(), Object.keys(locales.ru).sort());
  });

  it('the English strings have no Cyrillic', () => {
    for (const [key, value] of Object.entries(locales.en)) {
      assert.doesNotMatch(value, CYRILLIC, key);
    }
  });

  it('every key the pages and scripts use exists', async () => {
    const used = new Set();
    for (const file of await readdir(new URL('../public/', import.meta.url))) {
      const text = file.endsWith('.js') || file.endsWith('.html') ? await publicFile(file) : '';
      for (const [, key] of text.matchAll(/\bt\('([a-z0-9_]+)'/g)) used.add(key);
      for (const [, key] of text.matchAll(/data-i18n(?:-placeholder|-label)?="([^"]+)"/g)) used.add(key);
    }
    // Keys built at run time: history labels by score code, the theme button.
    for (const code of Object.keys(ruApi.score)) used.add(`score_${code}`);
    for (const mode of ['auto', 'light', 'dark']) used.add(`theme_${mode}`);

    assert.ok(used.size > 100);
    for (const key of used) {
      for (const lang of ['ru', 'en']) assert.ok(key in locales[lang], `${lang}.json has no "${key}"`);
    }
  });

  it('the history shows the same score labels as the API', () => {
    for (const [lang, api] of [['ru', ruApi], ['en', enApi]]) {
      for (const [code, label] of Object.entries(api.score)) {
        assert.equal(locales[lang][`score_${code}`], label, `${lang} score_${code}`);
      }
    }
  });
});

describe('API texts (src/i18n/)', () => {
  it('en has exactly the keys of ru', () => {
    const paths = (dict) => leaves(dict).map(([path]) => path.replace(/\[\d+\]$/, '[]'));
    const ruPaths = new Set(paths(ruApi));
    // Russian plurals have a third form ("few"); English has two.
    const enPaths = new Set(paths(enApi));
    for (const path of ruPaths) {
      if (path.endsWith('.few')) continue;
      assert.ok(enPaths.has(path), `en.js has no ${path}`);
    }
    for (const path of enPaths) assert.ok(ruPaths.has(path), `ru.js has no ${path}`);
  });

  it('the English texts have no Cyrillic', () => {
    for (const [path, value] of leaves(enApi)) assert.doesNotMatch(value, CYRILLIC, path);
  });

  it('resolves the asked language, Russian by default', () => {
    assert.equal(resolveLang('en'), 'en');
    assert.equal(resolveLang('EN-gb'), 'en');
    assert.equal(resolveLang('ru'), 'ru');
    assert.equal(resolveLang(undefined), 'ru');
    assert.equal(resolveLang('de'), 'ru');
    assert.equal(resolveLang(42), 'ru');
    assert.equal(resolveLang('constructor'), 'ru');
  });

  it('reads the first language of Accept-Language', () => {
    assert.equal(langFromAcceptLanguage('en-US,en;q=0.9,ru;q=0.8'), 'en');
    assert.equal(langFromAcceptLanguage('ru-RU,ru;q=0.9,en;q=0.8'), 'ru');
    assert.equal(langFromAcceptLanguage('de-DE,en;q=0.5'), 'ru');
    assert.equal(langFromAcceptLanguage(null), 'ru');
  });

  it('analyzes in English with no Cyrillic left', () => {
    for (const password of ['a', 'aaaa', 'password', 'p@$$w0rd', 'qwerty123', 'hello12345', 'birthday1990!A',
      '123456789!@#', 'OnlyLetters!', 'abcdefgh', 'weekly-check-Storm#2045', 'X$k9Lm!2qW@7nRtP', '🔐SecurePass1!']) {
      const analysis = analyzePassword(password, 'en');
      const recommendations = generateRecommendations(password, analysis, 'en');
      assert.doesNotMatch(JSON.stringify({ analysis, recommendations }), CYRILLIC, password);
    }
  });

  it('keeps the score and the weakness codes the same in both languages', () => {
    const ru = analyzePassword('password', 'ru');
    const en = analyzePassword('password', 'en');
    assert.equal(ru.score, en.score);
    assert.deepEqual(ru.weaknessCodes, en.weaknessCodes);
    assert.ok(en.weaknessCodes.includes('common_pattern'));
    assert.equal(en.weaknesses.length, ru.weaknesses.length);
  });

  it('formats the crack time in English', () => {
    assert.equal(formatDuration(0.5, 'en'), 'Instantly');
    assert.equal(formatDuration(65, 'en'), '1 minute and 5 seconds');
    assert.equal(formatDuration(2 * 86_400 + 3_600, 'en'), '2 days and 1 hour');
    assert.equal(formatDuration(1_000 * 31_536_000, 'en'), '1,000 years');
    assert.equal(formatDuration(Infinity, 'en'), 'Practically impossible to brute-force');
  });
});

describe('passphrase word lists (public/wordlists.js)', () => {
  const themes = Object.keys(WORDLISTS.ru);

  it('both languages have the same six themes, each in the theme picker', async () => {
    assert.deepEqual(Object.keys(WORDLISTS.en), themes);
    assert.equal(themes.length, 6);
    const html = await publicFile('index.html');
    for (const theme of themes) assert.match(html, new RegExp(`<option value="${theme}"`));
    assert.deepEqual(Object.keys(MNEMONIC_ACTIONS).sort(), ['en', 'ru']);
  });

  it('each theme has 80 different words', () => {
    for (const lang of ['ru', 'en']) {
      for (const theme of themes) {
        assert.equal(new Set(WORDLISTS[lang][theme]).size, 80, `${lang}.${theme}`);
      }
    }
  });

  it('English words are plain Latin and none trips the analyzer', () => {
    // The generator appends a digit to a word; l33t decoding turns some digits
    // into letters (eagle5 → eagles), so every digit is checked.
    for (const word of Object.values(WORDLISTS.en).flat()) {
      assert.match(word, /^[A-Z][a-z]+$/);
      for (const suffix of ['', ...'0123456789']) {
        const { weaknessCodes } = analyzePassword(word + suffix);
        for (const code of ['common_pattern', 'keyboard', 'sequence']) {
          assert.ok(!weaknessCodes.includes(code), `${word}${suffix}: ${code}`);
        }
      }
    }
  });
});
