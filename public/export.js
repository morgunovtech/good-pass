export function initExport() {
  document.getElementById('btn-export')?.addEventListener('click', exportPNG);
}

async function exportPNG() {
  const canvas = document.createElement('canvas');
  const w = 800;
  const h = 500;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Background.
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, w, h, 24);
  ctx.fill();

  // Title.
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 28px Inter, system-ui, sans-serif';
  ctx.fillText('Good Pass — Анализ пароля', 40, 60);

  // Gather data from DOM.
  const score = document.getElementById('score')?.textContent || '—';
  const time = document.getElementById('time')?.textContent || '—';
  const entropy = document.getElementById('entropy')?.textContent || '—';
  const nist = document.getElementById('nist-badge')?.textContent || '';
  const breach = document.getElementById('breach-badge')?.textContent || '';

  // Score badge.
  const scoreColor = getScoreColor(score);
  ctx.fillStyle = scoreColor;
  roundRect(ctx, 40, 90, 200, 60, 12);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px Inter, system-ui, sans-serif';
  ctx.fillText(score, 60, 130);

  // Stats.
  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px Inter, system-ui, sans-serif';
  ctx.fillText(`Время перебора: ${time}`, 40, 190);
  ctx.fillText(`Энтропия: ${entropy}`, 40, 220);

  if (nist) {
    ctx.fillText(`NIST: ${nist}`, 40, 250);
  }
  if (breach) {
    ctx.fillText(`Утечки: ${breach}`, 40, 280);
  }

  // Strengths.
  const strengths = [...document.querySelectorAll('#strengths li')].map((li) => li.textContent);
  const weaknesses = [...document.querySelectorAll('#weaknesses li')].map((li) => li.textContent);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillText('Сильные стороны:', 40, 330);
  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  strengths.slice(0, 3).forEach((s, i) => {
    ctx.fillText(`+ ${s}`, 40, 355 + i * 22);
  });

  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 16px Inter, system-ui, sans-serif';
  ctx.fillText('Слабые стороны:', 420, 330);
  ctx.font = '14px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  weaknesses.slice(0, 3).forEach((s, i) => {
    ctx.fillText(`- ${truncate(s, 40)}`, 420, 355 + i * 22);
  });

  // Watermark.
  ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillText('goodpass.app | Open Source', 40, h - 20);

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

function getScoreColor(score) {
  if (score.includes('Отличный')) return '#38bdf8';
  if (score.includes('Сильный')) return '#4ade80';
  if (score.includes('Средний')) return '#facc15';
  if (score.includes('Слабый')) return '#f97316';
  return '#f87171';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}
