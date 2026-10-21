/* 決まった値と見本データ（docs/DB設計.md「見本データ」と同じ中身） */
(function () {
  'use strict';
  const TB = (window.TaskBoard = window.TaskBoard || {});

  TB.COLUMNS = Object.freeze([
    { status: 'todo', title: '未着手' },
    { status: 'doing', title: '作業中' },
    { status: 'done', title: '完了' },
  ]);

  TB.LABEL_COLORS = Object.freeze([
    { key: 'green', name: '緑' },
    { key: 'yellow', name: '黄' },
    { key: 'orange', name: 'オレンジ' },
    { key: 'red', name: '赤' },
    { key: 'purple', name: '紫' },
    { key: 'blue', name: '青' },
  ]);

  TB.PRIORITIES = Object.freeze([
    { key: 'high', name: '高' },
    { key: 'medium', name: '中' },
    { key: 'low', name: '低' },
  ]);

  // R-06 文字数の上限、R-17 ラベルの数、R-29 タスクの上限
  TB.LIMITS = Object.freeze({
    title: 100,
    description: 1000,
    labelName: 20,
    boardName: 20,
    tasksPerBoard: 200,
    labelsPerBoard: 20,
  });

  function task(id, boardId, status, position, title, extra) {
    return {
      id,
      boardId,
      status,
      position,
      title,
      description: null,
      isCompleted: false,
      priority: null,
      dueDate: null,
      labelIds: [],
      ...extra,
    };
  }

  // 呼ぶたびに新しい見本データを作る（再読み込みで見本に戻る）
  TB.createSeed = function createSeed() {
    const boards = [
      { id: 1, name: '仕事', position: 0 },
      { id: 2, name: 'プライベート', position: 1 },
    ];

    const labels = [
      { id: 1, boardId: 1, name: '緊急', color: 'red' },
      { id: 2, boardId: 1, name: '請求', color: 'yellow' },
      { id: 3, boardId: 1, name: '会議', color: 'blue' },
      { id: 4, boardId: 1, name: '資料', color: 'green' },
      { id: 5, boardId: 1, name: '連絡', color: 'orange' },
      { id: 6, boardId: 1, name: '学習', color: 'purple' },
      { id: 7, boardId: 2, name: '大事', color: 'red' },
      { id: 8, boardId: 2, name: '家事', color: 'yellow' },
      { id: 9, boardId: 2, name: '健康', color: 'blue' },
      { id: 10, boardId: 2, name: '買い物', color: 'green' },
      { id: 11, boardId: 2, name: '趣味', color: 'orange' },
      { id: 12, boardId: 2, name: '予定', color: 'purple' },
    ];

    const tasks = [
      // 仕事
      task(1, 1, 'todo', 0, '企画書を書く', {
        description: '来月のキャンペーン企画。たたき台を作って部長に見せる。',
        priority: 'high', dueDate: '2026-10-31', labelIds: [1, 4],
      }),
      task(2, 1, 'todo', 1, '会議の議事録をまとめる', { priority: 'medium', labelIds: [3] }),
      task(3, 1, 'todo', 2, '来年度の計画を立てる', { dueDate: '2027-01-15' }),
      task(4, 1, 'doing', 0, '請求書を作る', { priority: 'high', dueDate: '2026-10-25', labelIds: [2] }),
      task(5, 1, 'doing', 1, 'React入門の第3章を読む', {
        description: 'コンポーネントと props の章。',
        priority: 'low', labelIds: [6],
      }),
      task(6, 1, 'done', 0, '取引先へ連絡する', { isCompleted: true, labelIds: [5] }),
      task(7, 1, 'done', 1, '先月の請求書を送る', { isCompleted: true, dueDate: '2026-10-10', labelIds: [2] }),
      // プライベート
      task(8, 2, 'todo', 0, '牛乳と卵を買う', { priority: 'medium', dueDate: '2026-10-21', labelIds: [10] }),
      task(9, 2, 'todo', 1, '部屋の掃除', { labelIds: [8] }),
      task(10, 2, 'todo', 2, '旅行の計画を立てる', { priority: 'low', labelIds: [11] }),
      task(11, 2, 'doing', 0, 'ジョギング（週3回）', { description: '朝7時から30分。', labelIds: [9] }),
      task(12, 2, 'done', 0, '歯医者の予約', { isCompleted: true, labelIds: [12, 7] }),
    ];

    return { boards, labels, tasks, nextId: 100 };
  };
})();
