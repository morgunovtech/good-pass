const input = document.getElementById('password-input');
const strengthLabel = document.getElementById('strength-label');
const toggleButton = document.getElementById('toggle-visibility');
const meterFill = document.querySelector('.meter-fill');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const entropyEl = document.getElementById('entropy');
const strengthsList = document.getElementById('strengths');
const weaknessesList = document.getElementById('weaknesses');
const analysisSection = document.querySelector('.analysis');
const generateButton = document.getElementById('generate-password');
const copyButton = document.getElementById('copy-password');

let controller;
let debounceTimer;

// Toggle password visibility.
toggleButton?.addEventListener('click', () => {
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  toggleButton.setAttribute('aria-pressed', String(isHidden));
  toggleButton.textContent = isHidden ? 'Скрыть' : 'Показать';
  toggleButton.setAttribute('aria-label', isHidden ? 'Скрыть пароль' : 'Показать пароль');
  input.focus();
});

// Generate strong password.
generateButton?.addEventListener('click', () => {
  const password = generatePassword();
  input.value = password;
  input.type = 'text';
  toggleButton.setAttribute('aria-pressed', 'true');
  toggleButton.textContent = 'Скрыть';
  toggleButton.setAttribute('aria-label', 'Скрыть пароль');
  input.dispatchEvent(new Event('input'));
});

// Copy password to clipboard.
copyButton?.addEventListener('click', async () => {
  const password = input.value;
  if (!password) return;

  try {
    await navigator.clipboard.writeText(password);
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Скопировано!';
    copyButton.setAttribute('aria-label', 'Пароль скопирован');
    setTimeout(() => {
      copyButton.textContent = originalText;
      copyButton.setAttribute('aria-label', 'Скопировать пароль');
    }, 1500);
  } catch {
    copyButton.textContent = 'Ошибка';
    setTimeout(() => { copyButton.textContent = 'Копировать'; }, 1500);
  }
});

// Main input handler with debounce.
input.addEventListener('input', (event) => {
  const password = event.target.value;
  strengthLabel.textContent = password ? 'Анализируем\u2026' : 'Введите пароль, чтобы начать.';

  // Show/hide copy button.
  if (copyButton) copyButton.style.display = password ? '' : 'none';

  if (controller) {
    controller.abort();
  }

  if (!password) {
    clearTimeout(debounceTimer);
    resetResults();
    return;
  }

  // Show analysis section on first input.
  if (analysisSection) analysisSection.classList.add('visible');

  // Show loading skeleton.
  showSkeleton();

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => analyzePassword(password), 250);
});

async function analyzePassword(password) {
  controller = new AbortController();

  try {
    const response = await fetch('/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      signal: controller.signal
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Server error');
    }

    const result = await response.json();
    renderResult(password, result);
  } catch (error) {
    if (error.name === 'AbortError') return;
    strengthLabel.textContent = 'Не удалось получить ответ. Попробуйте снова.';
    hideSkeleton();
  }
}

function renderResult(password, result) {
  hideSkeleton();
  const strengthLevel = mapScoreToLevel(result.scoreLabel);
  meterFill.dataset.strength = strengthLevel.toString();

  strengthLabel.textContent = password ? `Пароль: ${result.scoreLabel}` : 'Введите пароль, чтобы начать.';
  scoreEl.textContent = result.scoreLabel ?? '\u2014';
  timeEl.textContent = result.estimatedTime ?? '\u2014';
  updateTimeTooltip(result.estimatedSeconds);
  entropyEl.textContent = result.entropyBits ? `${result.entropyBits} бит` : '\u2014';

  renderList(strengthsList, result.strengths, 'Добавьте больше длины и разнообразия.');
  renderList(weaknessesList, result.weaknesses, 'Пароль выглядит устойчивым — продолжайте в том же духе.');
}

function updateTimeTooltip(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    timeEl.removeAttribute('title');
    return;
  }

  if (!Number.isFinite(seconds)) {
    timeEl.title = 'Больше 10^18 секунд — практический перебор невозможен.';
    return;
  }

  timeEl.title = seconds < 1
    ? 'Меньше секунды. Нужно увеличить длину и разнообразие.'
    : `Оценка перебора: ~${seconds.toLocaleString('ru-RU')} секунд.`;
}

function renderList(container, items, emptyState) {
  container.replaceChildren();

  if (!items || items.length === 0) {
    const li = document.createElement('li');
    li.textContent = emptyState;
    container.appendChild(li);
    return;
  }

  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    container.appendChild(li);
  });
}

function resetResults() {
  strengthLabel.textContent = 'Введите пароль, чтобы начать.';
  if (toggleButton) {
    toggleButton.textContent = 'Показать';
    toggleButton.setAttribute('aria-pressed', 'false');
    toggleButton.setAttribute('aria-label', 'Показать пароль');
  }
  if (input.type !== 'password') {
    input.type = 'password';
  }
  meterFill.dataset.strength = '0';
  scoreEl.textContent = '\u2014';
  timeEl.textContent = '\u2014';
  entropyEl.textContent = '\u2014';
  timeEl.removeAttribute('title');
  renderList(strengthsList, null, 'Введите пароль, чтобы увидеть сильные стороны.');
  renderList(weaknessesList, null, 'Печатайте пароль — здесь появятся подсказки.');
  if (analysisSection) analysisSection.classList.remove('visible');
  if (copyButton) copyButton.style.display = 'none';
}

function mapScoreToLevel(score) {
  switch (score) {
    case 'Очень слабый':
    case 'Слабый':
      return 1;
    case 'Средний':
      return 2;
    case 'Сильный':
      return 3;
    case 'Отличный':
      return 4;
    default:
      return 0;
  }
}

function showSkeleton() {
  for (const el of [scoreEl, timeEl, entropyEl]) {
    el.classList.add('skeleton');
  }
}

function hideSkeleton() {
  for (const el of [scoreEl, timeEl, entropyEl]) {
    el.classList.remove('skeleton');
  }
}

// Password generator — produces a passphrase of random words + symbol + digit.
function generatePassword() {
  const words = [
    'Гроза', 'Пламя', 'Ветер', 'Облако', 'Скала', 'Река', 'Волна', 'Искра',
    'Замок', 'Мост', 'Тропа', 'Озеро', 'Медведь', 'Орёл', 'Тигр', 'Сова',
    'Звезда', 'Луна', 'Солнце', 'Комета', 'Якорь', 'Маяк', 'Парус', 'Кедр',
    'Шторм', 'Лавина', 'Бриз', 'Туман', 'Рассвет', 'Закат', 'Утёс', 'Вершина',
    'Сапфир', 'Рубин', 'Янтарь', 'Кристалл', 'Гранит', 'Опал', 'Тополь', 'Клён'
  ];
  const symbols = '!@#$%&*-+=?';
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const digit = Math.floor(Math.random() * 9000) + 1000;
  const sym = pick([...symbols]);

  return `${pick(words)}-${pick(words)}${sym}${digit}`;
}

resetResults();
