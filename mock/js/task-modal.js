/* S-02 タスク作成モーダル／S-03 タスク編集モーダル／S-04 タスク削除確認ダイアログ */
(function () {
  'use strict';
  const TB = window.TaskBoard;
  const { store, ui } = TB;
  const { el } = ui;

  const dialog = document.getElementById('task-dialog');
  const form = document.getElementById('task-form');
  const fields = form.elements;
  const heading = document.getElementById('task-dialog-title');
  const errorBox = document.getElementById('task-form-error');
  const submitBtn = document.getElementById('task-submit');
  const deleteBtn = document.getElementById('task-delete');
  const deleteDialog = document.getElementById('delete-dialog');
  const deleteConfirm = document.getElementById('delete-confirm');

  let mode = 'create'; // 'create'（S-02） か 'edit'（S-03）
  let editingId = null;
  let busy = false;

  // 選択肢は最初に1回だけ作る
  fields.status.replaceChildren(...TB.COLUMNS.map((c) => el('option', { value: c.status, text: c.title })));
  fields.priority.replaceChildren(
    el('option', { value: '', text: 'なし' }),
    ...TB.PRIORITIES.map((p) => el('option', { value: p.key, text: p.name })),
  );

  function renderLabelOptions(selectedIds) {
    const s = store.get();
    const labels = store.query.labels(s, s.activeBoardId);
    document.getElementById('task-label-options').replaceChildren(...(labels.length
      ? labels.map((label) => el('label', { class: 'label-option' }, [
        el('input', { type: 'checkbox', name: 'labelIds', value: label.id, checked: selectedIds.includes(label.id) }),
        ui.labelChip(label),
      ]))
      : [el('p', { class: 'hint', text: 'このボードにはまだラベルがありません（ラベル管理から作れます）' })]));
  }

  function setError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }

  // R-03 タイトルが空（空白だけも含む）のときは「作成」「保存」を押せない
  function updateSubmit() {
    submitBtn.disabled = busy || !fields.title.value.trim();
  }

  // R-24 サーバーの返事を待つ間はボタンを押せない
  function setBusy(next) {
    busy = next;
    submitBtn.textContent = busy ? '保存中…' : mode === 'create' ? '作成' : '保存';
    form.querySelectorAll('[data-action], #task-delete').forEach((b) => { b.disabled = busy; });
    updateSubmit();
  }

  function open(nextMode, values, returnSelector) {
    mode = nextMode;
    heading.textContent = mode === 'create' ? 'タスクを作成' : 'タスクを編集';
    deleteBtn.hidden = mode === 'create';
    fields.title.value = values.title || '';
    fields.description.value = values.description || '';
    fields.status.value = values.status;
    fields.priority.value = values.priority || '';
    fields.dueDate.value = values.dueDate || '';
    renderLabelOptions(values.labelIds || []);
    setError('');
    setBusy(false);
    ui.openDialog(dialog, returnSelector);
  }

  function openCreate(status) {
    editingId = null;
    open('create', { status }, `[data-add-status="${status}"]`); // R-02 押したカラムが最初から入る
  }

  function openEdit(taskId) {
    const task = store.query.task(store.get(), taskId);
    if (!task) {
      ui.toast('このタスクはすでに削除されています');
      return;
    }
    editingId = taskId;
    open('edit', task, `[data-task-id="${taskId}"] .card-title`);
  }

  function collect() {
    return {
      title: fields.title.value,
      description: fields.description.value,
      status: fields.status.value,
      priority: fields.priority.value || null,
      dueDate: fields.dueDate.value || null,
      labelIds: [...form.querySelectorAll('input[name="labelIds"]:checked')].map((input) => Number(input.value)),
    };
  }

  form.addEventListener('input', updateSubmit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;
    const input = collect();
    const boardId = store.get().activeBoardId;
    const reducer = mode === 'create'
      ? (st) => store.ops.createTask(st, boardId, input)
      : (st) => store.ops.updateTask(st, editingId, input);
    setError('');
    setBusy(true);
    try {
      await store.saveThenApply(reducer);
      setBusy(false);
      ui.closeDialog(dialog);
    } catch (err) {
      setBusy(false);
      setError(ui.errorMessage(err)); // R-25 モーダルは開いたまま、入力内容も残す
    }
  });

  // R-03 キャンセル・×・Esc は入力を捨てて閉じる。外側のクリックでは閉じない
  form.querySelectorAll('[data-action="cancel"], [data-action="close"]').forEach((b) => {
    b.addEventListener('click', () => ui.closeDialog(dialog));
  });
  dialog.addEventListener('cancel', (e) => { if (busy) e.preventDefault(); });

  document.getElementById('task-due-clear').addEventListener('click', () => {
    fields.dueDate.value = '';
    fields.dueDate.focus();
  });

  /* ---------- S-04 タスク削除確認ダイアログ ---------- */
  deleteBtn.addEventListener('click', () => {
    const task = store.query.task(store.get(), editingId);
    document.getElementById('delete-task-name').textContent = `「${task ? task.title : ''}」`;
    deleteConfirm.disabled = false;
    ui.openDialog(deleteDialog, '#task-delete');
  });

  document.getElementById('delete-cancel').addEventListener('click', () => ui.closeDialog(deleteDialog));
  deleteDialog.addEventListener('cancel', (e) => { if (deleteConfirm.disabled) e.preventDefault(); }); // 削除中は Esc で閉じない

  deleteConfirm.addEventListener('click', async () => {
    deleteConfirm.disabled = true;
    try {
      await store.saveThenApply((st) => store.ops.deleteTask(st, editingId));
      ui.closeDialog(deleteDialog);
      ui.closeDialog(dialog);
    } catch (err) {
      ui.closeDialog(deleteDialog);
      setError(ui.errorMessage(err));
    } finally {
      deleteConfirm.disabled = false;
    }
  });

  TB.taskModal = { openCreate, openEdit };
})();
