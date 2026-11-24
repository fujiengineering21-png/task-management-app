import type { CreateTaskInput, Priority, TaskStatus } from '../api/schemas'

/** 作成の小窓の入力欄の値。画面の入力欄に合わせて、「なし」は空の文字で持つ */
export interface TaskFormValues {
  title: string
  description: string
  status: TaskStatus
  /** '' ＝優先度なし */
  priority: Priority | ''
  /** '' ＝期限なし。それ以外は「2026-11-25」の形 */
  dueDate: string
  labelIds: number[]
}

/** 小窓を開いたときの値。押したカラムだけが入り、ほかは空（R-02） */
export function initialTaskForm(status: TaskStatus): TaskFormValues {
  return { title: '', description: '', status, priority: '', dueDate: '', labelIds: [] }
}

/** 「作成」を押せるか。前後の空白を除いたタイトルが1文字以上あるとき（R-03・R-05） */
export function canSubmitTaskForm(values: TaskFormValues): boolean {
  return values.title.trim() !== ''
}

/** サーバーに送る形に直す。前後の空白を取り、空の説明・優先度・期限は null にする（元の値は変えない） */
export function toCreateTaskInput(values: TaskFormValues): CreateTaskInput {
  const description = values.description.trim()
  return {
    title: values.title.trim(),
    description: description === '' ? null : description,
    status: values.status,
    priority: values.priority === '' ? null : values.priority,
    dueDate: values.dueDate === '' ? null : values.dueDate,
    labelIds: [...values.labelIds],
  }
}
