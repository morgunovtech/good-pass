const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'a']);

export function sanitizeHtml(input) {
  if (!input) return '';
  const withoutScripts = input.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1>/gi, '');

  return withoutScripts.replace(/<([^>]+)>/g, (match, tagContent) => {
    const normalized = tagContent.trim();
    const isClosing = normalized.startsWith('/');
    const tagName = (isClosing ? normalized.slice(1) : normalized).split(/\s+/)[0]?.toLowerCase() ?? '';
    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    if (isClosing) {
      return `</${tagName}>`;
    }

    const safeAttrs = normalized
      .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
      .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
      .replace(/on[a-z]+\s*=\s*[^\s>]+/gi, '')
      .replace(/href\s*=\s*"javascript:[^"]*"/gi, '')
      .replace(/href\s*=\s*'javascript:[^']*'/gi, '')
      .trim();

    return `<${safeAttrs}>`;
  });
}

export function escapeText(text) {
  return text
    ?.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
