import { WORDLISTS, WORDLIST_LABELS } from './wordlists.js';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const SEPARATORS = { hyphen: '-', dot: '.', underscore: '_', space: ' ' };

let currentMode = 'random';
let currentSettings = {
  random: { length: 20, upper: true, lower: true, digits: true, symbols: true },
  passphrase: { words: 4, separator: 'hyphen', capitalize: true, numbers: true, theme: 'default' }
};

export function initGenerator() {
  const panel = document.getElementById('generator-panel');
  if (!panel) return;

  // Tab switching.
  document.querySelectorAll('[data-gen-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.genTab;
      document.querySelectorAll('[data-gen-tab]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('gen-random').style.display = currentMode === 'random' ? '' : 'none';
      document.getElementById('gen-passphrase').style.display = currentMode === 'passphrase' ? '' : 'none';
    });
  });

  // Random mode controls.
  const lengthSlider = document.getElementById('gen-length');
  const lengthValue = document.getElementById('gen-length-value');
  if (lengthSlider) {
    lengthSlider.addEventListener('input', () => {
      currentSettings.random.length = Number(lengthSlider.value);
      lengthValue.textContent = lengthSlider.value;
    });
  }

  for (const id of ['gen-upper', 'gen-lower', 'gen-digits', 'gen-symbols']) {
    const el = document.getElementById(id);
    if (el) {
      const key = id.replace('gen-', '');
      el.addEventListener('change', () => { currentSettings.random[key] = el.checked; });
    }
  }

  // Passphrase mode controls.
  const wordSlider = document.getElementById('gen-words');
  const wordValue = document.getElementById('gen-words-value');
  if (wordSlider) {
    wordSlider.addEventListener('input', () => {
      currentSettings.passphrase.words = Number(wordSlider.value);
      wordValue.textContent = wordSlider.value;
    });
  }

  const sepSelect = document.getElementById('gen-separator');
  if (sepSelect) sepSelect.addEventListener('change', () => { currentSettings.passphrase.separator = sepSelect.value; });

  const capToggle = document.getElementById('gen-capitalize');
  if (capToggle) capToggle.addEventListener('change', () => { currentSettings.passphrase.capitalize = capToggle.checked; });

  const numToggle = document.getElementById('gen-numbers');
  if (numToggle) numToggle.addEventListener('change', () => { currentSettings.passphrase.numbers = numToggle.checked; });

  const themeSelect = document.getElementById('gen-theme');
  if (themeSelect) themeSelect.addEventListener('change', () => { currentSettings.passphrase.theme = themeSelect.value; });

  // Generate buttons.
  document.getElementById('btn-generate')?.addEventListener('click', () => {
    const pw = generate();
    setPasswordAndAnalyze(pw);
  });

  document.getElementById('btn-regenerate')?.addEventListener('click', () => {
    const pw = generate();
    setPasswordAndAnalyze(pw);
  });

  document.getElementById('btn-batch')?.addEventListener('click', generateBatch);
}

function secureRandom(max) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

function securePick(items) {
  return items[secureRandom(items.length)];
}

export function generate() {
  return currentMode === 'random' ? generateRandom() : generatePassphrase();
}

function generateRandom() {
  const s = currentSettings.random;
  let pool = '';
  if (s.lower) pool += LOWER;
  if (s.upper) pool += UPPER;
  if (s.digits) pool += DIGITS;
  if (s.symbols) pool += SYMBOLS;
  if (!pool) pool = LOWER + DIGITS;

  const chars = [];
  // Ensure at least one from each selected category.
  if (s.lower) chars.push(securePick([...LOWER]));
  if (s.upper) chars.push(securePick([...UPPER]));
  if (s.digits) chars.push(securePick([...DIGITS]));
  if (s.symbols) chars.push(securePick([...SYMBOLS]));

  const remaining = Math.max(0, s.length - chars.length);
  const poolArr = [...pool];
  for (let i = 0; i < remaining; i++) {
    chars.push(securePick(poolArr));
  }

  // Shuffle using Fisher-Yates.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

function generatePassphrase() {
  const s = currentSettings.passphrase;
  const wordlist = WORDLISTS[s.theme] || WORDLISTS.default;
  const sep = SEPARATORS[s.separator] || '-';

  const words = [];
  for (let i = 0; i < s.words; i++) {
    let word = securePick(wordlist);
    if (s.capitalize) {
      word = word[0].toUpperCase() + word.slice(1);
    } else {
      word = word.toLowerCase();
    }
    if (s.numbers) {
      word += secureRandom(10);
    }
    words.push(word);
  }

  const passphrase = words.join(sep);

  // Show mnemonic.
  showMnemonic(words, sep);

  return passphrase;
}

function showMnemonic(words, sep) {
  const container = document.getElementById('mnemonic-tip');
  if (!container) return;

  const actions = ['обрушилась на', 'летит к', 'зовёт', 'сияет рядом с', 'защищает', 'встречает'];
  const parts = words.map((w, i) => {
    const clean = w.replace(/\d+$/, '');
    if (i === 0) return clean;
    return `${securePick(actions)} ${clean}`;
  });

  container.textContent = `Представьте: ${parts.join(', ')}.`;
  container.style.display = '';
}

function generateBatch() {
  const container = document.getElementById('batch-results');
  if (!container) return;

  container.replaceChildren();
  for (let i = 0; i < 5; i++) {
    const pw = generate();
    const li = document.createElement('li');
    li.className = 'batch-item';

    const span = document.createElement('span');
    span.className = 'batch-password';
    span.textContent = pw;

    const btn = document.createElement('button');
    btn.className = 'btn-action batch-copy';
    btn.textContent = 'Копировать';
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pw);
        btn.textContent = 'Скопировано!';
        setTimeout(() => { btn.textContent = 'Копировать'; }, 1200);
      } catch { /* noop */ }
    });

    const useBtn = document.createElement('button');
    useBtn.className = 'btn-action batch-use';
    useBtn.textContent = 'Анализ';
    useBtn.addEventListener('click', () => setPasswordAndAnalyze(pw));

    li.append(span, btn, useBtn);
    container.appendChild(li);
  }
  container.style.display = '';
}

function setPasswordAndAnalyze(password) {
  const input = document.getElementById('password-input');
  if (!input) return;
  input.value = password;
  input.type = 'text';

  const toggle = document.getElementById('toggle-visibility');
  if (toggle) {
    toggle.setAttribute('aria-pressed', 'true');
    toggle.textContent = 'Скрыть';
  }

  input.dispatchEvent(new Event('input'));
}
