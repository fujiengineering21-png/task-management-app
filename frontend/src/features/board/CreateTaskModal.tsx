import { useBoardLabels, useCreateTask } from '../../api/queries'
import type { TaskStatus } from '../../api/schemas'
import { initialTaskForm, toCreateTaskInput, type TaskFormValues } from '../../lib/taskForm'
import { TaskFormDialog } from './TaskFormDialog'

interface CreateTaskModalProps {
  boardId: number
  /** 「タスクを追加」を押したカラム。カラム欄に最初から入れる（R-02） */
  initialStatus: TaskStatus
  onClose: () => void
}

/** タスク作成の小窓（S-02・F-10）。ボードのラベルを読み、「作成」でサーバーに送る */
export function CreateTaskModal({ boardId, initialStatus, onClose }: CreateTaskModalProps) {
  const labelsQuery = useBoardLabels(boardId)
  const createTask = useCreateTask(boardId)

  async function submit(values: TaskFormValues): Promise<boolean> {
    try {
      await createTask.mutateAsync(toCreateTaskInput(values))
      return true
    } catch {
      // 失敗の中身は createTask.error に入り、小窓の中に表示する（握りつぶさない）
      return false
    }
  }

  return (
    <TaskFormDialog
      heading="タスクを作成"
      submitLabel="作成"
      pendingLabel="作成中…"
      initialValues={initialTaskForm(initialStatus)}
      labels={labelsQuery.data}
      labelsFailed={labelsQuery.isError}
      pending={createTask.isPending}
      error={createTask.error}
      onSubmit={submit}
      onClose={onClose}
    />
  )
}
