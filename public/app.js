const input = document.getElementById('password-input');
const strengthLabel = document.getElementById('strength-label');
const toggleButton = document.getElementById('toggle-visibility');
const meterFill = document.querySelector('.meter-fill');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const entropyEl = document.getElementById('entropy');
const strengthsList = document.getElementById('strengths');
const weaknessesList = document.getElementById('weaknesses');

let controller;

toggleButton?.addEventListener('click', () => {
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  toggleButton.setAttribute('aria-pressed', String(isHidden));
  toggleButton.textContent = isHidden ? 'Скрыть' : 'Показать';
  toggleButton.setAttribute('aria-label', isHidden ? 'Скрыть пароль' : 'Показать пароль');
  input.focus();
});

input.addEventListener('input', async (event) => {
  const password = event.target.value;
  strengthLabel.textContent = password ? 'Анализируем…' : 'Введите пароль, чтобы начать.';

  if (controller) {
    controller.abort();
  }
  controller = new AbortController();

  if (!password) {
    resetResults();
    return;
  }

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error('Server error');
    }

    const result = await response.json();
    renderResult(password, result);
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    strengthLabel.textContent = 'Не удалось получить ответ. Попробуйте снова.';
  }
});

function renderResult(password, result) {
  const strengthLevel = mapScoreToLevel(result.scoreLabel);
  meterFill.dataset.strength = strengthLevel.toString();

  strengthLabel.textContent = password ? `Пароль: ${result.scoreLabel}` : 'Введите пароль, чтобы начать.';
  scoreEl.textContent = result.scoreLabel ?? '—';
  timeEl.textContent = result.estimatedTime ?? '—';
  updateTimeTooltip(result.estimatedSeconds);
  entropyEl.textContent = result.entropyBits ? `${result.entropyBits} бит` : '—';

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
  container.innerHTML = '';

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
  scoreEl.textContent = '—';
  timeEl.textContent = '—';
  entropyEl.textContent = '—';
  timeEl.removeAttribute('title');
  renderList(strengthsList, null, 'Введите пароль, чтобы увидеть сильные стороны.');
  renderList(weaknessesList, null, 'Печатайте пароль — здесь появятся подсказки.');
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

resetResults();
