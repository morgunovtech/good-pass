const MAX_ITEMS = 10;
let history = [];

export function initHistory() {
  document.getElementById('btn-clear-history')?.addEventListener('click', clearHistory);
  document.getElementById('btn-toggle-history')?.addEventListener('click', toggleSidebar);
  render();
}

export function addToHistory(entry) {
  history.unshift({
    password: entry.password,
    scoreLabel: entry.scoreLabel,
    entropyBits: entry.entropyBits,
    time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  });

  if (history.length > MAX_ITEMS) history.pop();
  render();
}

function clearHistory() {
  history = [];
  render();
}

function toggleSidebar() {
  const sidebar = document.getElementById('history-sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

function render() {
  const list = document.getElementById('history-list');
  if (!list) return;
  list.replaceChildren();

  if (history.length === 0) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.textContent = 'История пуста.';
    list.appendChild(li);
    return;
  }

  history.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const info = document.createElement('div');
    info.className = 'history-info';

    const masked = maskPassword(entry.password);
    const pwSpan = document.createElement('span');
    pwSpan.className = 'history-pw';
    pwSpan.textContent = masked;

    const meta = document.createElement('span');
    meta.className = 'history-meta';
    meta.textContent = `${entry.scoreLabel} | ${entry.entropyBits} бит | ${entry.time}`;

    info.append(pwSpan, meta);

    const btn = document.createElement('button');
    btn.className = 'btn-action';
    btn.textContent = 'Проверить';
    btn.addEventListener('click', () => {
      const input = document.getElementById('password-input');
      if (input) {
        input.value = entry.password;
        input.dispatchEvent(new Event('input'));
      }
    });

    li.append(info, btn);
    list.appendChild(li);
  });
}

function maskPassword(pw) {
  if (pw.length <= 4) return '*'.repeat(pw.length);
  return pw.slice(0, 2) + '*'.repeat(Math.min(pw.length - 4, 8)) + pw.slice(-2);
}
