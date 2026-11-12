import type { Board, Task } from '../api/schemas'

/** テスト用のボード（見本データと同じ2つ） */
export const boards: Board[] = [
  { id: 2, name: 'プライベート', position: 1 },
  { id: 1, name: '仕事', position: 0 },
]

/** 作り物のタスクを作る。指定しなかった項目は「設定なし」にする */
export function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    boardId: 1,
    status: 'todo',
    position: 0,
    description: null,
    completed: false,
    priority: null,
    dueDate: null,
    labels: [],
    ...overrides,
  }
}

/** ボードごとのタスク（API と同じく、未着手 → 作業中 → 完了、カラムの中は position の順） */
export const tasksByBoard: Record<number, Task[]> = {
  1: [
    makeTask({
      id: 1,
      title: '経費の精算を出す',
      priority: 'high',
      dueDate: '2026-11-07',
      labels: [
        { id: 1, name: '緊急', color: 'red' },
        { id: 2, name: '請求', color: 'yellow' },
      ],
    }),
    makeTask({ id: 2, title: '週次レポートを書く', position: 1, priority: 'medium' }),
    makeTask({
      id: 3,
      title: '会議の資料をまとめる',
      status: 'doing',
      description: '議題と前回の決定事項を1枚にまとめる',
      labels: [{ id: 3, name: '会議', color: 'blue' }],
    }),
    makeTask({ id: 5, title: '取引先に日程の返事をする', status: 'done', completed: true }),
  ],
  2: [makeTask({ id: 6, boardId: 2, title: '日用品を買う', status: 'todo' })],
}
