export function sanitizeHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
