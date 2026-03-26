export function initShortcuts() {
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;

    // Ctrl/Cmd + G — generate password.
    if (mod && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      document.getElementById('btn-generate')?.click();
    }

    // Ctrl/Cmd + H — toggle password visibility.
    if (mod && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      document.getElementById('toggle-visibility')?.click();
    }

    // Escape — close modals.
    if (e.key === 'Escape') {
      document.getElementById('trainer-modal')?.classList.remove('open');
      document.getElementById('history-sidebar')?.classList.remove('open');
    }
  });
}
