/* S-01 ボード画面：タブ・絞り込み・カラム・カード・D&D・整列・チェック */
(function () {
  'use strict';
  const TB = window.TaskBoard;
  const { store, ui } = TB;
  const { el } = ui;

  let editingBoardId = null; // ボード名を編集中のボード
  let dragTaskId = null; // ドラッグ中のタスク
  const indicator = el('li', { class: 'drop-indicator', 'aria-hidden': 'true' });

  function render(s) {
    const normal = s.screen === 'normal';
    document.getElementById('header-actions').hidden = !normal;
    document.getElementById('board-tabs').hidden = !normal;
    renderTabs(s);
    renderFilter(s, normal);
    renderBoardArea(s);
  }

  /* ---------- ボードのタブ（F-02, F-03, R-23） ---------- */
  function renderTabs(s) {
    const nav = document.getElementById('board-tabs');
    nav.replaceChildren(...store.query.boards(s).map((b) => (b.id === editingBoardId ? renameInput(b) : tabButton(s, b))));
  }

  function tabButton(s, board) {
    const active = board.id === s.activeBoardId;
    return el('button', {
      type: 'button',
      class: active ? 'tab is-active' : 'tab',
      'aria-pressed': String(active),
      'aria-keyshortcuts': 'F2',
      title: 'ダブルクリック（または F2 キー）で名前を変更',
      dataset: { boardId: String(board.id) },
      text: board.name,
      onclick: () => {
        if (!active) store.applyLocal((st) => store.ops.switchBoard(st, board.id));
      },
    });
  }

  function startRename(e) {
    const tab = e.target instanceof Element ? e.target.closest('[data-board-id]') : null;
    if (!tab) return;
    e.preventDefault();
    editingBoardId = Number(tab.dataset.boardId);
    renderTabs(store.get());
    const input = document.querySelector('#board-tabs input');
    input.focus();
    input.select();
  }
  // 切り替えでタブが描き直されても拾えるよう、nav でまとめて受ける。
  // マウスはダブルクリック、キーボードは F2 で名前を変えられる（N-19）
  const tabsNav = document.getElementById('board-tabs');
  tabsNav.addEventListener('dblclick', startRename);
  tabsNav.addEventListener('keydown', (e) => { if (e.key === 'F2') startRename(e); });

  function renameInput(board) {
    let finished = false;
    const input = el('input', {
      class: 'tab-input', value: board.name, maxlength: TB.LIMITS.boardName, 'aria-label': 'ボード名',
    });
    // 入力欄を閉じてタブに戻す。キーボードで操作していたときはタブにフォーカスを戻す（N-21）
    const close = (restoreFocus) => {
      editingBoardId = null;
      renderTabs(store.get());
      const tab = document.querySelector(`#board-tabs [data-board-id="${board.id}"]`);
      if (restoreFocus && tab) tab.focus();
    };
    const finish = (commit, restoreFocus) => {
      if (finished) return;
      finished = true;
      const name = input.value.trim();
      if (!commit || !name || name === board.name) { // 空なら元の名前に戻す
        close(restoreFocus);
        return;
      }
      input.disabled = true;
      store.saveThenApply((st) => store.ops.renameBoard(st, board.id, name))
        .catch((err) => ui.toast(ui.errorMessage(err)))
        .finally(() => close(restoreFocus));
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') finish(true, true);
      if (e.key === 'Escape') finish(false, true);
    });
    input.addEventListener('blur', () => finish(true, false)); // ほかの場所をクリックしたときはフォーカスを奪わない
    return input;
  }

  /* ---------- ラベルで絞り込み（F-44, R-19〜R-22） ---------- */
  function setFilter(labelIds) {
    store.applyLocal((st) => store.ops.setFilter(st, labelIds));
  }

  function renderFilter(s, normal) {
    const labels = store.query.labels(s, s.activeBoardId);
    const selected = s.filterLabelIds;
    document.getElementById('filter-summary').textContent =
      selected.length ? `ラベルで絞り込み（${selected.length}） ▼` : 'ラベルで絞り込み ▼';

    document.getElementById('filter-options').replaceChildren(
      ...labels.map((label) => el('label', { class: 'filter-option' }, [
        el('input', {
          type: 'checkbox',
          value: label.id,
          checked: selected.includes(label.id),
          onchange: (e) => {
            const ids = e.target.checked ? [...selected, label.id] : selected.filter((id) => id !== label.id);
            setFilter(ids);
            const again = document.querySelector(`#filter-options input[value="${label.id}"]`);
            if (again) again.focus(); // 描き直しても同じチェックボックスに戻る
          },
        }),
        ui.labelChip(label),
      ])),
      el('button', { type: 'button', class: 'link-btn', text: '絞り込みを解除', disabled: !selected.length, onclick: () => setFilter([]) }),
    );

    const bar = document.getElementById('filter-bar');
    bar.hidden = !(normal && selected.length);
    if (!bar.hidden) {
      const names = selected.map((id) => store.query.label(s, id)).filter(Boolean).map(ui.labelText);
      bar.replaceChildren(
        el('span', { text: `絞り込み中：${names.join('、')}（この間は並べ替えとタスクの追加ができません）` }),
        el('button', { type: 'button', class: 'link-btn', text: '解除', onclick: () => setFilter([]) }),
      );
    }
  }

  /* ---------- ボード本体（F-01, F-52） ---------- */
  function renderBoardArea(s) {
    const main = document.getElementById('board');
    main.setAttribute('aria-busy', String(s.screen === 'loading'));
    if (s.screen === 'loading') {
      main.replaceChildren(el('p', { class: 'board-message', role: 'status', text: '読み込み中…' }));
      return;
    }
    if (s.screen === 'error') { // R-26
      main.replaceChildren(el('div', { class: 'board-message board-message--error', role: 'alert' }, [
        el('p', { text: 'サーバーに接続できません' }),
        el('button', { type: 'button', class: 'btn btn-primary', text: '再読み込み', onclick: () => TB.app.reload() }),
      ]));
      return;
    }
    const filtering = s.filterLabelIds.length > 0;
    main.replaceChildren(...TB.COLUMNS.map((col) => renderColumn(s, col, filtering)));
  }

  function renderColumn(s, col, filtering) {
    const all = store.query.tasksIn(s, s.activeBoardId, col.status);
    const visible = filtering ? all.filter((t) => t.labelIds.some((id) => s.filterLabelIds.includes(id))) : all;
    const headingId = `column-${col.status}`;
    const section = el('section', { class: 'column', 'aria-labelledby': headingId, dataset: { status: col.status } }, [
      el('div', { class: 'column-header' }, [
        el('h2', { id: headingId, class: 'column-title' }, [
          document.createTextNode(col.title),
          el('span', { class: 'column-count', text: filtering ? `(${visible.length}/${all.length})` : `(${all.length})` }), // F-05, R-21
        ]),
        columnMenu(col, filtering),
      ]),
      el('ol', { class: 'card-list', 'aria-label': `${col.title}のタスク` }, visible.map((t) => renderCard(s, t, filtering))),
      filtering ? null : el('button', { // R-20 絞り込み中は出さない
        type: 'button', class: 'add-task', dataset: { addStatus: col.status }, text: '＋ タスクを追加',
        onclick: () => TB.taskModal.openCreate(col.status),
      }),
    ]);
    if (!filtering) attachDropHandlers(section, col.status);
    return section;
  }

  /* ---------- 整列（F-23） ---------- */
  function columnMenu(col, filtering) {
    const items = filtering
      ? [el('p', { class: 'menu-note', text: '絞り込み中は並べ替えできません' })]
      : [['priority', '優先度順に並べる'], ['due', '期限順に並べる']].map(([mode, text]) => el('button', {
        type: 'button', class: 'menu-item', text,
        onclick: () => sortColumn(col.status, mode),
      }));
    return el('details', { class: 'popover-menu column-menu' }, [
      el('summary', { class: 'icon-btn', 'aria-label': `${col.title}の並べ替えメニュー`, title: '並べ替え', text: '⋯' }),
      el('div', { class: 'popover popover--right' }, items),
    ]);
  }

  function sortColumn(status, mode) {
    const s = store.get();
    const boardId = s.activeBoardId;
    const original = store.query.tasksIn(s, boardId, status).map((t) => t.id);
    // メニューの項目は描き直しで消えるので、同じカラムの「⋯」にフォーカスを戻す
    const focusMenu = () => {
      const summary = document.querySelector(`.column[data-status="${status}"] .column-menu > summary`);
      if (summary) summary.focus();
    };
    store.applyThenSave(
      (st) => store.ops.sortColumn(st, boardId, status, mode),
      (st) => store.ops.setColumnOrder(st, boardId, status, original),
    ).catch((err) => { ui.toast(`${ui.errorMessage(err)}（元の並びに戻しました）`); focusMenu(); });
    focusMenu();
  }

  /* ---------- カード（R-08〜R-12） ---------- */
  function renderCard(s, task, filtering) {
    const labels = task.labelIds.map((id) => store.query.label(s, id)).filter(Boolean);
    const card = el('li', {
      class: task.isCompleted ? 'card is-completed' : 'card',
      draggable: filtering ? 'false' : 'true',
      dataset: { taskId: String(task.id) },
    }, [
      labels.length ? el('div', { class: 'card-labels' }, labels.map(ui.labelChip)) : null,
      el('div', { class: 'card-main' }, [
        el('button', {
          type: 'button', class: 'card-check', role: 'checkbox',
          'aria-checked': String(task.isCompleted), 'aria-label': `「${task.title}」の完了マーク`,
          text: task.isCompleted ? '✓' : '',
          onclick: (e) => { e.stopPropagation(); toggleComplete(task.id); }, // R-12 詳細は開かない
        }),
        el('button', { type: 'button', class: 'card-title', text: task.title, onclick: () => TB.taskModal.openEdit(task.id) }),
      ]),
      metaRow(task),
    ]);
    card.addEventListener('click', (e) => {
      if (!(e.target instanceof Element) || !e.target.closest('button')) TB.taskModal.openEdit(task.id);
    });
    if (!filtering) attachDragHandlers(card, task.id);
    return card;
  }

  function metaRow(task) {
    const items = [];
    if (task.priority) {
      const priority = TB.PRIORITIES.find((p) => p.key === task.priority);
      items.push(el('span', { class: `badge badge--${task.priority}`, text: `優先:${priority.name}` }));
    }
    if (task.dueDate) items.push(el('span', { class: 'due', title: `期限 ${task.dueDate}`, text: `〆${store.formatDue(task.dueDate)}` }));
    if (task.description) items.push(el('span', { role: 'img', 'aria-label': '説明あり', title: '説明あり', text: '📝' }));
    return items.length ? el('div', { class: 'card-meta' }, items) : null;
  }

  function toggleComplete(taskId) {
    const focusCheck = () => {
      const check = document.querySelector(`[data-task-id="${taskId}"] .card-check`);
      if (check) check.focus();
    };
    const toggle = (st) => store.ops.toggleComplete(st, taskId);
    store.applyThenSave(toggle, toggle) // 元に戻すときも、もう一度切り替える
      .catch((err) => { ui.toast(`${ui.errorMessage(err)}（元に戻しました）`); focusCheck(); });
    focusCheck(); // 描き直したあとも同じチェックボックスにフォーカスを置く
  }

  /* ---------- ドラッグ＆ドロップ（F-20, F-21, R-14, R-15） ---------- */
  function attachDragHandlers(card, taskId) {
    card.addEventListener('dragstart', (e) => {
      dragTaskId = taskId;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(taskId));
      requestAnimationFrame(() => card.classList.add('is-dragging'));
    });
    card.addEventListener('dragend', () => {
      dragTaskId = null;
      card.classList.remove('is-dragging');
      indicator.remove();
    });
  }

  // マウスの高さから、何番目に入れるかを決める（ドラッグ中のカードは数えない）
  function dropPosition(list, clientY) {
    const cards = [...list.querySelectorAll('.card:not(.is-dragging)')];
    const i = cards.findIndex((c) => {
      const r = c.getBoundingClientRect();
      return clientY < r.top + r.height / 2;
    });
    return i === -1 ? { index: cards.length, before: null } : { index: i, before: cards[i] };
  }

  function attachDropHandlers(section, status) {
    const list = section.querySelector('.card-list');
    section.addEventListener('dragover', (e) => {
      if (dragTaskId === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const { before } = dropPosition(list, e.clientY);
      if (before) list.insertBefore(indicator, before);
      else list.append(indicator);
    });
    section.addEventListener('dragleave', (e) => {
      if (!section.contains(e.relatedTarget)) indicator.remove();
    });
    section.addEventListener('drop', (e) => {
      if (dragTaskId === null) return;
      e.preventDefault();
      const taskId = dragTaskId;
      dragTaskId = null; // 描き直しでカードが消えると dragend が来ないブラウザがあるため、ここで消す
      const { index } = dropPosition(list, e.clientY);
      indicator.remove();
      const s = store.get();
      const task = store.query.task(s, taskId);
      const from = {
        status: task.status,
        index: store.query.tasksIn(s, task.boardId, task.status).findIndex((t) => t.id === taskId),
      };
      store.applyThenSave(
        (st) => store.ops.moveTask(st, taskId, status, index),
        (st) => store.ops.moveTask(st, taskId, from.status, from.index), // 元の場所へ戻す
      ).catch((err) => ui.toast(`${ui.errorMessage(err)}（カードを元の位置に戻しました）`));
    });
  }

  TB.board = { render };
})();
