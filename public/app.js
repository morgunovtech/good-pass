const input = document.getElementById('password-input');
const strengthLabel = document.getElementById('strength-label');
const meterFill = document.querySelector('.meter-fill');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const entropyEl = document.getElementById('entropy');
const strengthsList = document.getElementById('strengths');
const weaknessesList = document.getElementById('weaknesses');

let controller;

input.addEventListener('input', async (event) => {
  const password = event.target.value;
  strengthLabel.textContent = password ? 'Анализируем…' : 'Введите пароль, чтобы начать.';

  if (controller) {
    controller.abort();
  }
  controller = new AbortController();

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
  entropyEl.textContent = result.entropyBits ? `${result.entropyBits} бит` : '—';

  renderList(strengthsList, result.strengths, 'Добавьте больше длины и разнообразия.');
  renderList(weaknessesList, result.weaknesses, 'Пароль выглядит устойчивым — продолжайте в том же духе.');
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
