import { useRef, useState } from 'react'
import { ApiError } from '../../api/client'
import { useBoardLabels, useDeleteTask, useUpdateTask } from '../../api/queries'
import type { Task } from '../../api/schemas'
import { toCreateTaskInput, toTaskFormValues, type TaskFormValues } from '../../lib/taskForm'
import { DeleteTaskDialog } from './DeleteTaskDialog'
import { TaskFormDialog } from './TaskFormDialog'

/** ほかの人が削除していたタスクを保存したときの文（R-28） */
const ALREADY_DELETED_MESSAGE = 'このタスクはすでに削除されています'

interface EditTaskModalProps {
  boardId: number
  /** 開いたときのタスク。入力欄に今の値を入れる */
  task: Task
  /** 小窓が閉じたあとに呼ぶ。保存したときは保存後のタスクを渡す（カーソルを当て直すため） */
  onClose: (saved: Task | null) => void
  /** 削除が済んだとき（F-12）。両方の小窓を閉じるのは呼んだ側で行う */
  onDeleted: (task: Task) => void
}

/**
 * タスク編集の小窓（S-03・F-11）。作成と同じ TaskFormDialog を使い、見出し・ボタンの文字・初期値だけを変える。
 * 「保存」で全部の項目を送り（PUT）、「キャンセル」・×・Esc では何も送らない。
 */
export function EditTaskModal({ boardId, task, onClose, onDeleted }: EditTaskModalProps) {
  const labelsQuery = useBoardLabels(boardId)
  const updateTask = useUpdateTask(boardId)
  const deleteTask = useDeleteTask(boardId)
  // 削除の確認の小窓（S-04）を開いているか
  const [confirmingDelete, setConfirmingDelete] = useState(false)
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

  // 削除を送ってから結果が出るまで true。素早く2回押されても、2回送らないよう ref で持つ
  const deletingRef = useRef(false)

  async function confirmDelete() {
    if (deletingRef.current) {
      return
    }
    deletingRef.current = true
    try {
      await deleteTask.mutateAsync(task.id)
      onDeleted(task)
    } catch {
      // 失敗の中身は deleteTask.error に入り、確認の小窓の中に表示する（握りつぶさない）
    } finally {
      deletingRef.current = false
    }
  }

  function cancelDelete() {
    deleteTask.reset()
    setConfirmingDelete(false)
  }

  return (
    <>
      <TaskFormDialog
        heading="タスクを編集"
        submitLabel="保存"
        pendingLabel="保存中…"
        initialValues={toTaskFormValues(task)}
        labels={labelsQuery.data}
        labelsFailed={labelsQuery.isError}
        pending={updateTask.isPending || deleteTask.isPending}
        error={toEditError(updateTask.error)}
        onSubmit={submit}
        onClose={() => onClose(savedRef.current)}
        footerStart={
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={updateTask.isPending}
            className="rounded-md px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-bg disabled:opacity-50"
          >
            削除
          </button>
        }
      />
      {confirmingDelete && (
        <DeleteTaskDialog
          taskTitle={task.title}
          pending={deleteTask.isPending}
          error={deleteTask.error}
          onConfirm={() => void confirmDelete()}
          onCancel={cancelDelete}
        />
      )}
    </>
  )
}

/** タスクがもうないとき（サーバーは「タスクが見つかりません」）は、R-28 の文に置き換える */
function toEditError(error: Error | null): unknown {
  if (error instanceof ApiError && error.code === 'TASK_NOT_FOUND') {
    return new ApiError(error.code, ALREADY_DELETED_MESSAGE)
  }
  return error
}
