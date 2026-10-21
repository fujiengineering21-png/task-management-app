/* S-05 ラベル管理モーダル／S-06 ラベル削除確認ダイアログ */
(function () {
  'use strict';
  const TB = window.TaskBoard;
  const { store, ui } = TB;
  const { el } = ui;

  const dialog = document.getElementById('label-dialog');
  const list = document.getElementById('label-list');
  const errorBox = document.getElementById('label-error');
  const newColor = document.getElementById('new-label-color');
  const newName = document.getElementById('new-label-name');
  const newSwatch = document.getElementById('new-label-swatch');
  const addBtn = document.getElementById('add-label');
  const deleteDialog = document.getElementById('label-delete-dialog');
  const deleteConfirm = document.getElementById('label-delete-confirm');

  let deletingId = null;
  let adding = false; // 追加の二重送信を防ぐ（R-24）
  let deleting = false;

  function colorOptions(selected) {
    return TB.LABEL_COLORS.map((c) => el('option', { value: c.key, text: c.name, selected: c.key === selected }));
  }
  newColor.replaceChildren(...colorOptions('green'));
  newColor.addEventListener('change', () => { newSwatch.className = `swatch chip--${newColor.value}`; });

  function setError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  /**
   * 一覧を今のデータに合わせる。
   * ラベルの並びが同じなら行は作り直さず中身だけ合わせる（入力中の文字やカーソル位置を消さないため）。
   * @param {string|null} revertKey 保存に失敗した欄。この欄だけは入力中でも元の値に戻す
   */
  function render(revertKey = null) {
    const s = store.get();
    const board = s.boards.find((b) => b.id === s.activeBoardId);
    const labels = store.query.labels(s, s.activeBoardId);
    document.getElementById('label-board-name').textContent = `「${board.name}」`;
    document.getElementById('label-count').textContent = `（${labels.length} / ${TB.LIMITS.labelsPerBoard} 個）`;
    addBtn.disabled = adding;

    const rows = [...list.children];
    const sameRows = rows.length === labels.length && labels.every((l, i) => Number(rows[i].dataset.labelId) === l.id);
    if (sameRows) {
      labels.forEach((label, i) => updateRow(rows[i], label, revertKey));
      return;
    }
    const focusKey = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.focusKey : undefined;
    list.replaceChildren(...labels.map(row));
    if (focusKey) {
      const again = list.querySelector(`[data-focus-key="${focusKey}"]`);
      if (again) again.focus();
    }
  }

  function row(label) {
    const li = el('li', { class: 'label-row', dataset: { labelId: String(label.id) } }, [
      el('span', { class: `swatch chip--${label.color}`, 'aria-hidden': 'true' }),
      el('select', {
        dataset: { focusKey: `color-${label.id}` },
        onchange: (e) => save(label.id, { color: e.target.value }, `color-${label.id}`), // 選んだらすぐ保存
      }, colorOptions(label.color)),
      el('input', {
        value: label.name, maxlength: TB.LIMITS.labelName, placeholder: '名前なし', autocomplete: 'off',
        dataset: { focusKey: `name-${label.id}` },
        onchange: (e) => save(label.id, { name: e.target.value }, `name-${label.id}`), // Enter か、欄から離れたときに保存
      }),
      el('button', {
        type: 'button', class: 'icon-btn', text: '🗑',
        dataset: { focusKey: `delete-${label.id}` },
        onclick: () => askDelete(label.id),
      }),
    ]);
    updateRow(li, label, null);
    return li;
  }

  function updateRow(li, label, revertKey) {
    const select = li.querySelector('select');
    const input = li.querySelector('input');
    const keepTyping = (field) => document.activeElement === field && field.dataset.focusKey !== revertKey;
    li.querySelector('.swatch').className = `swatch chip--${label.color}`;
    if (!keepTyping(select)) select.value = label.color;
    if (!keepTyping(input)) input.value = label.name;
    const text = ui.labelText(label);
    select.setAttribute('aria-label', `「${text}」の色`);
    input.setAttribute('aria-label', `「${text}」の名前`);
    li.querySelector('button').setAttribute('aria-label', `ラベル「${text}」を削除`);
  }

  async function save(labelId, changes, focusKey) {
    setError('');
    try {
      await store.saveThenApply((st) => store.ops.updateLabel(st, labelId, changes));
    } catch (err) {
      setError(ui.errorMessage(err));
      render(focusKey); // 失敗した欄だけ元の値に戻す
    }
  }

  async function add() {
    if (adding) return;
    const boardId = store.get().activeBoardId;
    setError('');
    adding = true;
    addBtn.disabled = true;
    try {
      await store.saveThenApply((st) => store.ops.addLabel(st, boardId, newColor.value, newName.value));
      newName.value = '';
    } catch (err) {
      setError(ui.errorMessage(err)); // 上限（20個）や重複のときはここに理由が出る
    } finally {
      adding = false;
      render();
    }
  }
  addBtn.addEventListener('click', add);
  newName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  });

  function open() {
    setError('');
    newName.value = '';
    render();
    ui.openDialog(dialog, '#open-label-manager');
  }

  dialog.querySelectorAll('[data-action="close"]').forEach((b) => b.addEventListener('click', () => ui.closeDialog(dialog)));
  store.subscribe(() => { if (dialog.open) render(); });

  /* ---------- S-06 ラベル削除確認ダイアログ（R-18） ---------- */
  function askDelete(labelId) {
    const s = store.get();
    const label = store.query.label(s, labelId);
    if (!label) return;
    deletingId = labelId;
    document.getElementById('label-delete-message').textContent =
      `ラベル「${ui.labelText(label)}」は ${store.query.labelUsage(s, labelId)} 件のタスクから外れます。削除しますか？`;
    deleteConfirm.disabled = false;
    ui.openDialog(deleteDialog, `[data-focus-key="delete-${labelId}"]`, '#new-label-name');
  }

  document.getElementById('label-delete-cancel').addEventListener('click', () => ui.closeDialog(deleteDialog));
  deleteDialog.addEventListener('cancel', (e) => { if (deleting) e.preventDefault(); }); // 削除中は Esc で閉じない

  deleteConfirm.addEventListener('click', async () => {
    deleting = true;
    deleteConfirm.disabled = true;
    setError('');
    try {
      await store.saveThenApply((st) => store.ops.deleteLabel(st, deletingId));
    } catch (err) {
      setError(ui.errorMessage(err));
    } finally {
      deleting = false;
      ui.closeDialog(deleteDialog);
    }
  });

  TB.labelModal = { open };
})();
