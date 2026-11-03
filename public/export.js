export function initExport() {
  document.getElementById('btn-export')?.addEventListener('click', exportPNG);
}

// The PNG follows the page: colours are the design-system tokens of the
// current theme (tokens.css + the strength scale in styles.css), fonts are
// IBM Plex. DS rules apply here too: no rounded corners, no gradients,
// weights up to 600.
function palette() {
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return {
    paper: v('--v4-paper', '#f5f2ed'),
    fg: v('--v4-fg', '#14110d'),
    muted: v('--v4-muted', '#5a554c'),
    dim: v('--v4-dim', '#6c6759'),
    line: v('--v4-line', '#c9c5bd'),
    accent: v('--v4-orange', '#d9531e'),
    strength: [0, 1, 2, 3, 4].map((i) => v(`--strength-${i}`, '#5a554c')),
    sans: v('--v4-sans', 'system-ui, sans-serif'),
    mono: v('--v4-mono', 'ui-monospace, monospace')
  };
}

async function exportPNG() {
  const p = palette();
  // Canvas only uses webfonts that are already loaded.
  await Promise.all([
    document.fonts.load(`500 28px ${p.sans}`),
    document.fonts.load(`400 16px ${p.sans}`),
    document.fonts.load(`500 11px ${p.mono}`)
  ]).catch(() => {});

  const canvas = document.createElement('canvas');
  const w = 800;
  const h = 500;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Background and frame.
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = p.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.fillStyle = p.accent;
  ctx.fillRect(0, 0, w, 4);

  // Title.
  ctx.fillStyle = p.fg;
  ctx.font = `500 28px ${p.sans}`;
  ctx.fillText('Good Pass — анализ пароля', 40, 64);

  // Gather data from DOM.
  const score = document.getElementById('score')?.textContent || '—';
  const time = document.getElementById('time')?.textContent || '—';
  const entropy = document.getElementById('entropy')?.textContent || '—';
  const nist = document.getElementById('nist-badge')?.textContent || '';
  const breach = document.getElementById('breach-badge')?.textContent || '';

  // Score: outlined badge in the strength colour, like .badge on the page.
  const scoreColor = p.strength[scoreLevel(score)];
  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(41, 91, 238, 58);
  ctx.fillStyle = scoreColor;
  ctx.font = `500 22px ${p.sans}`;
  ctx.fillText(score, 60, 128);

  // Stats.
  ctx.fillStyle = p.muted;
  ctx.font = `400 16px ${p.sans}`;
  ctx.fillText(`Время перебора: ${time}`, 40, 190);
  ctx.fillText(`Энтропия: ${entropy}`, 40, 220);
  if (nist) ctx.fillText(`NIST: ${nist}`, 40, 250);
  if (breach) ctx.fillText(`Утечки: ${breach}`, 40, 280);

  // Strengths and weaknesses under DS micro-labels.
  const strengths = [...document.querySelectorAll('#strengths li')].map((li) => li.textContent);
  const weaknesses = [...document.querySelectorAll('#weaknesses li')].map((li) => li.textContent);
  const label = (text, x, color) => {
    ctx.fillStyle = color;
    ctx.font = `500 11px ${p.mono}`;
    ctx.fillText(spaced(text.toUpperCase()), x, 330);
  };
  label('Сильные стороны', 40, p.strength[3]);
  label('Слабые стороны', 420, p.strength[1]);
  ctx.fillStyle = p.fg;
  ctx.font = `400 14px ${p.sans}`;
  strengths.slice(0, 3).forEach((s, i) => ctx.fillText(`+ ${truncate(s, 40)}`, 40, 357 + i * 22));
  weaknesses.slice(0, 3).forEach((s, i) => ctx.fillText(`− ${truncate(s, 40)}`, 420, 357 + i * 22));

  // Footer: the real address of the page.
  ctx.fillStyle = p.line;
  ctx.fillRect(40, h - 44, w - 80, 1);
  ctx.fillStyle = p.dim;
  ctx.font = `400 11px ${p.mono}`;
  ctx.fillText(location.host || 'good-pass.pages.dev', 40, h - 22);

  // Download.
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'good-pass-report.png';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// Same scale as the meter: 0 very weak … 4 excellent.
function scoreLevel(score) {
  if (score.includes('Отличный')) return 4;
  if (score.includes('Сильный')) return 3;
  if (score.includes('Средний')) return 2;
  if (score.includes('Слабый')) return 1;
  return 0;
}

// Canvas has no letter-spacing everywhere; thin spaces approximate the
// DS micro-label tracking (0.1em).
function spaced(text) {
  return text.split('').join(' ');
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
