import { useRef } from 'react'
import { ApiError } from '../../api/client'
import { useBoardLabels, useUpdateTask } from '../../api/queries'
import type { Task } from '../../api/schemas'
import { toCreateTaskInput, toTaskFormValues, type TaskFormValues } from '../../lib/taskForm'
import { TaskFormDialog } from './TaskFormDialog'

/** ほかの人が削除していたタスクを保存したときの文（R-28） */
const ALREADY_DELETED_MESSAGE = 'このタスクはすでに削除されています'

interface EditTaskModalProps {
  boardId: number
  /** 開いたときのタスク。入力欄に今の値を入れる */
  task: Task
  /** 小窓が閉じたあとに呼ぶ。保存したときは保存後のタスクを渡す（カーソルを当て直すため） */
  onClose: (saved: Task | null) => void
}

/**
 * タスク編集の小窓（S-03・F-11）。作成と同じ TaskFormDialog を使い、見出し・ボタンの文字・初期値だけを変える。
 * 「保存」で全部の項目を送り（PUT）、「キャンセル」・×・Esc では何も送らない。
 */
export function EditTaskModal({ boardId, task, onClose }: EditTaskModalProps) {
  const labelsQuery = useBoardLabels(boardId)
  const updateTask = useUpdateTask(boardId)
  // 保存したあとのタスク。画面の描き直しを待たずに、閉じたときに渡せるよう ref で持つ
  const savedRef = useRef<Task | null>(null)

  async function submit(values: TaskFormValues): Promise<boolean> {
    try {
      savedRef.current = await updateTask.mutateAsync({
        taskId: task.id,
        input: toCreateTaskInput(values),
      })
      return true
    } catch {
      // 失敗の中身は updateTask.error に入り、小窓の中に表示する（握りつぶさない）
      return false
    }
  }

  return (
    <TaskFormDialog
      heading="タスクを編集"
      submitLabel="保存"
      pendingLabel="保存中…"
      initialValues={toTaskFormValues(task)}
      labels={labelsQuery.data}
      labelsFailed={labelsQuery.isError}
      pending={updateTask.isPending}
      error={toEditError(updateTask.error)}
      onSubmit={submit}
      onClose={() => onClose(savedRef.current)}
    />
  )
}

/** タスクがもうないとき（サーバーは「タスクが見つかりません」）は、R-28 の文に置き換える */
function toEditError(error: Error | null): unknown {
  if (error instanceof ApiError && error.code === 'TASK_NOT_FOUND') {
    return new ApiError(error.code, ALREADY_DELETED_MESSAGE)
  }
  return error
}
