/**
 * Copy text across desktop/mobile and browsers (including many incognito modes).
 * Sync execCommand runs first so it stays inside the user gesture; Clipboard API
 * is used when execCommand fails (e.g. some locked-down contexts).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof text !== 'string' || text.length === 0) return false;

  // 1) Synchronous copy inside the same tick as click — best for incognito / iOS
  if (copyViaExecCommand(text)) return true;
  if (copyViaContentEditable(text)) return true;

  // 2) Clipboard API (may work when execCommand returned false)
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard?.writeText &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // denied / unsupported
    }
  }

  return false;
}

function copyViaExecCommand(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.width = '2em';
  ta.style.height = '2em';
  ta.style.padding = '0';
  ta.style.border = 'none';
  ta.style.outline = 'none';
  ta.style.boxShadow = 'none';
  ta.style.background = 'transparent';
  ta.style.opacity = '0';
  ta.style.pointerEvents = 'none';
  ta.setAttribute('tabindex', '-1');
  document.body.appendChild(ta);

  let ok = false;
  try {
    ta.focus();
    if (/ipad|iphone/i.test(navigator.userAgent)) {
      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      ta.setSelectionRange(0, text.length);
    } else {
      ta.select();
      ta.setSelectionRange(0, text.length);
    }
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(ta);
  }
  return ok;
}

function copyViaContentEditable(text: string): boolean {
  const el = document.createElement('div');
  el.contentEditable = 'true';
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  let ok = false;
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(el);
  }
  return ok;
}
