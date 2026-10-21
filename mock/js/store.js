/*
 * データの持ち方と操作。
 * モックではデータを JavaScript の中だけに持つ。本物のアプリでは、ここが APIサーバー＋データベースになる。
 * データは書き換えず、変更のたびに新しいオブジェクトを作る。
 */
(function () {
  'use strict';
  const TB = window.TaskBoard;
  const L = TB.LIMITS;

  class ValidationError extends Error {}

  const LATENCY_MS = 300; // サーバーの返事を待つ時間（の真似）
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
  const NO_PRIORITY_RANK = 3;
  const NO_DUE = '9999-12-31';

  let state = null;
  const listeners = [];

  function init(screen) {
    state = { ...TB.createSeed(), activeBoardId: 1, filterLabelIds: [], screen };
    notify();
  }
  function get() { return state; }
  function subscribe(fn) { listeners.push(fn); }
  function set(next) { state = next; notify(); }
  function notify() { listeners.forEach((fn) => fn(state)); }

  /* ---------- 読み取り ---------- */
  const query = {
    boards: (s) => [...s.boards].sort((a, b) => a.position - b.position),
    task: (s, id) => s.tasks.find((t) => t.id === id) || null,
    label: (s, id) => s.labels.find((l) => l.id === id) || null,
    labels: (s, boardId) => s.labels.filter((l) => l.boardId === boardId),
    tasksIn: (s, boardId, status) =>
      s.tasks.filter((t) => t.boardId === boardId && t.status === status).sort((a, b) => a.position - b.position),
    labelUsage: (s, labelId) => s.tasks.filter((t) => t.labelIds.includes(labelId)).length,
  };

  /* ---------- 入力チェック（R-05, R-06） ---------- */
  function cleanTaskInput(s, boardId, input) {
    const title = (input.title || '').trim();
    if (!title) throw new ValidationError('タイトルを入力してください');
    if (title.length > L.title) throw new ValidationError(`タイトルは${L.title}文字までです`);
    const description = (input.description || '').trim();
    if (description.length > L.description) throw new ValidationError(`説明は${L.description}文字までです`);
    if (!TB.COLUMNS.some((c) => c.status === input.status)) throw new ValidationError('カラムが正しくありません');
    if (input.priority && !Object.hasOwn(PRIORITY_RANK, input.priority)) throw new ValidationError('優先度が正しくありません');
    const labelIds = (input.labelIds || []).filter((id) => {
      const label = query.label(s, id);
      return label !== null && label.boardId === boardId; // 同じボードのラベルだけ
    });
    return {
      title,
      description: description || null,
      status: input.status,
      priority: input.priority || null,
      dueDate: input.dueDate || null,
      labelIds,
    };
  }

  /* ---------- 並び順 ---------- */
  function positionsFor(ids, status) {
    return new Map(ids.map((id, i) => [id, { status, position: i }]));
  }
  function withPositions(s, ...maps) {
    const updates = new Map(maps.flatMap((m) => [...m]));
    return { ...s, tasks: s.tasks.map((t) => (updates.has(t.id) ? { ...t, ...updates.get(t.id) } : t)) };
  }
  function requireTask(s, taskId) {
    const task = query.task(s, taskId);
    if (!task) throw new ValidationError('このタスクはすでに削除されています');
    return task;
  }

  /* ---------- タスクの操作 ---------- */
  function createTask(s, boardId, input) {
    const clean = cleanTaskInput(s, boardId, input);
    if (s.tasks.filter((t) => t.boardId === boardId).length >= L.tasksPerBoard) {
      throw new ValidationError('これ以上タスクを作成できません');
    }
    const position = query.tasksIn(s, boardId, clean.status).length; // R-01 一番下に入る
    const task = { id: s.nextId, boardId, ...clean, isCompleted: false, position };
    return { ...s, nextId: s.nextId + 1, tasks: [...s.tasks, task] };
  }

  function updateTask(s, taskId, input) {
    const task = requireTask(s, taskId);
    const clean = cleanTaskInput(s, task.boardId, input);
    const edited = { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, ...clean, status: task.status } : t)) };
    // R-04 カラムを変えたら移動先の一番下へ
    return clean.status === task.status ? edited : moveTask(edited, taskId, clean.status, Infinity);
  }

  function deleteTask(s, taskId) {
    const task = query.task(s, taskId);
    if (!task) return s; // すでに削除されていれば、削除できたものとして扱う
    const rest = { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) };
    const ids = query.tasksIn(rest, task.boardId, task.status).map((t) => t.id);
    return withPositions(rest, positionsFor(ids, task.status));
  }

  // toIndex：移動先カラムで、動かすタスクを除いた並びの何番目に入れるか
  function moveTask(s, taskId, toStatus, toIndex) {
    const task = requireTask(s, taskId);
    const fromIds = query.tasksIn(s, task.boardId, task.status).map((t) => t.id).filter((id) => id !== taskId);
    const baseIds = task.status === toStatus
      ? fromIds
      : query.tasksIn(s, task.boardId, toStatus).map((t) => t.id);
    const at = Math.max(0, Math.min(toIndex, baseIds.length));
    const toIds = [...baseIds.slice(0, at), taskId, ...baseIds.slice(at)];
    const fromMap = task.status === toStatus ? new Map() : positionsFor(fromIds, task.status);
    return withPositions(s, fromMap, positionsFor(toIds, toStatus));
  }

  function toggleComplete(s, taskId) {
    requireTask(s, taskId);
    return { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t)) };
  }

  /* ---------- 整列（F-23・Q15） ---------- */
  const priorityRank = (p) => PRIORITY_RANK[p] ?? NO_PRIORITY_RANK;
  const dueKey = (d) => d || NO_DUE;
  function compareFor(mode) {
    return (a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1; // チェック済みは一番下
      const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
      const byDue = dueKey(a.dueDate).localeCompare(dueKey(b.dueDate));
      const [first, second] = mode === 'priority' ? [byPriority, byDue] : [byDue, byPriority];
      return first || second || a.position - b.position;
    };
  }
  function sortColumn(s, boardId, status, mode) {
    const ids = query.tasksIn(s, boardId, status).sort(compareFor(mode)).map((t) => t.id);
    return withPositions(s, positionsFor(ids, status));
  }
  // 整列を元に戻すとき用：ids の順に並べ、その後に増えたタスクは後ろに付ける
  function setColumnOrder(s, boardId, status, ids) {
    const current = query.tasksIn(s, boardId, status).map((t) => t.id);
    const ordered = [...ids.filter((id) => current.includes(id)), ...current.filter((id) => !ids.includes(id))];
    return withPositions(s, positionsFor(ordered, status));
  }

  /* ---------- ボード（R-23） ---------- */
  function renameBoard(s, boardId, rawName) {
    const name = rawName.trim();
    if (!name) throw new ValidationError('ボード名を入力してください');
    if (name.length > L.boardName) throw new ValidationError(`ボード名は${L.boardName}文字までです`);
    if (s.boards.some((b) => b.id !== boardId && b.name === name)) {
      throw new ValidationError('もう一方のボードと同じ名前にはできません');
    }
    return { ...s, boards: s.boards.map((b) => (b.id === boardId ? { ...b, name } : b)) };
  }

  /* ---------- ラベル（R-17） ---------- */
  function checkLabel(s, boardId, color, rawName, exceptId) {
    const name = rawName.trim();
    if (!TB.LABEL_COLORS.some((c) => c.key === color)) throw new ValidationError('色が正しくありません');
    if (name.length > L.labelName) throw new ValidationError(`ラベル名は${L.labelName}文字までです`);
    const duplicated = s.labels.some(
      (l) => l.boardId === boardId && l.id !== exceptId && l.color === color && l.name === name,
    );
    if (duplicated) throw new ValidationError('色も名前も同じラベルがすでにあります');
    return { color, name };
  }
  function addLabel(s, boardId, color, name) {
    if (query.labels(s, boardId).length >= L.labelsPerBoard) {
      throw new ValidationError(`ラベルは1つのボードに${L.labelsPerBoard}個までです`);
    }
    const clean = checkLabel(s, boardId, color, name, null);
    return { ...s, nextId: s.nextId + 1, labels: [...s.labels, { id: s.nextId, boardId, ...clean }] };
  }
  function updateLabel(s, labelId, changes) {
    const label = query.label(s, labelId);
    if (!label) throw new ValidationError('このラベルはすでに削除されています');
    const clean = checkLabel(s, label.boardId, changes.color ?? label.color, changes.name ?? label.name, labelId);
    return { ...s, labels: s.labels.map((l) => (l.id === labelId ? { ...l, ...clean } : l)) };
  }
  function deleteLabel(s, labelId) {
    return {
      ...s,
      labels: s.labels.filter((l) => l.id !== labelId),
      tasks: s.tasks.map((t) =>
        t.labelIds.includes(labelId) ? { ...t, labelIds: t.labelIds.filter((id) => id !== labelId) } : t),
      filterLabelIds: s.filterLabelIds.filter((id) => id !== labelId),
    };
  }

  /* ---------- 画面だけの状態 ---------- */
  const switchBoard = (s, boardId) => ({ ...s, activeBoardId: boardId, filterLabelIds: [] }); // R-22
  const setFilter = (s, labelIds) => ({ ...s, filterLabelIds: labelIds });
  const setScreen = (s, screen) => ({ ...s, screen });

  /* ---------- サーバーの真似（R-24） ---------- */
  TB.mock = { failSave: false };
  function fakeServer() {
    return new Promise((resolve, reject) => {
      setTimeout(() => (TB.mock.failSave ? reject(new Error('server error')) : resolve()), LATENCY_MS);
    });
  }
  // 作成・編集・削除・ラベル・ボード名：サーバーの成功を待ってから画面に反映する
  async function saveThenApply(reducer) {
    reducer(state); // 先に入力チェックだけ行う（だめなら ValidationError）
    await fakeServer();
    set(reducer(state));
  }
  // D&D・チェック・整列：先に画面を変え、失敗したらその操作だけを元に戻す
  // （全体を前の状態に戻すと、待っている間に行ったほかの操作まで消えてしまうため）
  async function applyThenSave(reducer, rollback) {
    set(reducer(state));
    try {
      await fakeServer();
    } catch (err) {
      set(undoSafely(rollback));
      throw err;
    }
  }
  // 戻す相手がもう無い（例：待っている間に削除された）ときは、今の状態のままにする
  function undoSafely(rollback) {
    try {
      return rollback(state);
    } catch (undoErr) {
      if (undoErr instanceof ValidationError) return state;
      throw undoErr;
    }
  }
  // ボードの切り替え・絞り込みなど、保存しない画面の状態
  function applyLocal(reducer) { set(reducer(state)); }

  /* ---------- 表示用（R-11） ---------- */
  function formatDue(dateStr, today = new Date()) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return y === today.getFullYear() ? `${m}/${d}` : `${y}/${m}/${d}`;
  }

  TB.store = {
    ValidationError,
    init, get, subscribe,
    saveThenApply, applyThenSave, applyLocal,
    query,
    ops: {
      createTask, updateTask, deleteTask, moveTask, toggleComplete, sortColumn, setColumnOrder,
      renameBoard, addLabel, updateLabel, deleteLabel,
      switchBoard, setFilter, setScreen,
    },
    formatDue,
  };
})();
