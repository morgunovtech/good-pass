// Kept out of index.html: the CSP allows scripts from 'self' only.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
