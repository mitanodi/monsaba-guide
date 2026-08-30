(() => {
  const root = document.querySelector('[data-gift-code-list]');
  if (!root) return;
  const locale = document.body.dataset.locale || 'ja';
  const copiedLabel = root.dataset.copiedLabel || 'Copied';
  const copyLabel = root.dataset.copyLabel || 'Copy';
  async function writeClipboard(value) {
    if (navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(value); return; } catch {} }
    const textarea = document.createElement('textarea');
    textarea.value = value; textarea.setAttribute('readonly', ''); textarea.style.position = 'fixed'; textarea.style.opacity = '0';
    document.body.append(textarea); textarea.select(); const copied = document.execCommand('copy'); textarea.remove();
    if (!copied) throw new Error('Clipboard copy failed');
  }
  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy-code]');
    if (!button?.dataset.copyCode) return;
    try {
      await writeClipboard(button.dataset.copyCode);
      button.textContent = copiedLabel; button.classList.add('is-copied');
      window.MONSABA_TRACK?.event('gift_code_copy', { location: 'gift_codes', locale });
      window.setTimeout(() => { button.textContent = copyLabel; button.classList.remove('is-copied'); }, 1600);
    } catch { button.focus(); }
  });
})();
