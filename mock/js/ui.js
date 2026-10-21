/* 画面づくりの共通部品：要素の作成、エラー表示、モーダルの開け閉め、ラベルの見た目 */
(function () {
  'use strict';
  const TB = window.TaskBoard;

  const TOAST_MS = 4000;
  const SERVER_ERROR_MESSAGE = '保存できませんでした。時間をおいてもう一度お試しください';

  /**
   * 要素を作る。文字は textContent で入れるので、HTMLとして実行されない（N-10 XSS対策）。
   * @param {string} tag
   * @param {Object<string, *>} [attrs] text・class・dataset・on〇〇（イベント）・そのほかの属性
   * @param {Array<Node|null|false>} [children]
   * @returns {HTMLElement}
   */
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === 'text') node.textContent = value;
      else if (key === 'class') node.className = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : String(value));
    });
    children.forEach((child) => { if (child) node.append(child); });
    return node;
  }

  // R-25 画面上部に赤いメッセージを数秒出す（読み上げは #toast-area の aria-live に任せる）
  function toast(message) {
    const item = el('p', { class: 'toast', text: message });
    document.getElementById('toast-area').append(item);
    setTimeout(() => item.remove(), TOAST_MS);
  }

  function errorMessage(err) {
    return err instanceof TB.store.ValidationError ? err.message : SERVER_ERROR_MESSAGE;
  }

  /**
   * モーダルを開く。閉じたら returnSelector の要素へフォーカスを戻す（N-21）。
   * 画面が描き直されて元のボタンがなくなっていれば fallbackSelector へ戻す。
   */
  function openDialog(dialog, returnSelector, fallbackSelector = '#board') {
    dialog.addEventListener('close', () => {
      const target = document.querySelector(returnSelector) || document.querySelector(fallbackSelector);
      if (target) target.focus();
    }, { once: true });
    dialog.showModal();
    const first = dialog.querySelector('input:not([type="hidden"]), select, textarea, .dialog-footer button');
    if (first) first.focus();
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  /* ---------- ラベルの見た目（R-09） ---------- */
  function colorName(colorKey) {
    const color = TB.LABEL_COLORS.find((c) => c.key === colorKey);
    return color ? color.name : colorKey;
  }
  function labelText(label) {
    return label.name || `${colorName(label.color)}（名前なし）`;
  }
  function labelChip(label) {
    if (!label.name) {
      return el('span', { class: `chip chip--bar chip--${label.color}`, role: 'img', 'aria-label': labelText(label), title: labelText(label) });
    }
    return el('span', { class: `chip chip--${label.color}`, text: label.name });
  }

  /* ---------- ポップアップ（details）を外側クリック・Esc で閉じる ---------- */
  function closePopovers(except) {
    document.querySelectorAll('details.popover-menu[open]').forEach((d) => {
      if (d !== except) d.removeAttribute('open');
    });
  }
  document.addEventListener('click', (e) => {
    closePopovers(e.target instanceof Element ? e.target.closest('details.popover-menu') : null);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('details.popover-menu[open]');
    if (!open) return;
    closePopovers(null);
    open.querySelector('summary').focus();
  });

  TB.ui = { el, toast, errorMessage, openDialog, closeDialog, colorName, labelText, labelChip };
})();
