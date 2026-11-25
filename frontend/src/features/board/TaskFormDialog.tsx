import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
import { errorMessage } from '../../api/client'
import type { Label } from '../../api/schemas'
import { canSubmitTaskForm, type TaskFormValues } from '../../lib/taskForm'
import { TaskFormFields } from './TaskFormFields'

interface TaskFormDialogProps {
  /** 見出し（例：タスクを作成） */
  heading: string
  /** 送るボタンの文字（例：作成） */
  submitLabel: string
  /** 送っている間のボタンの文字（例：作成中…） */
  pendingLabel: string
  initialValues: TaskFormValues
  /** ボードのラベル。読み込み中は undefined */
  labels: Label[] | undefined
  /** ラベルを読み込めなかった */
  labelsFailed: boolean
  /** サーバーに送っている間は true。ボタンを押せなくし、Esc でも閉じない（R-24） */
  pending: boolean
  /** 送るのに失敗したときのエラー。なければ null */
  error: unknown
  /** 送る。成功したら true を返す（小窓を閉じる）。失敗なら false（小窓は開いたまま、入力は残す R-25） */
  onSubmit: (values: TaskFormValues) => Promise<boolean>
  /** 小窓が閉じたあとに呼ぶ（成功・キャンセル・×・Esc のどれでも） */
  onClose: () => void
  /** 下のボタンの並びの左はしに置くもの（編集の「削除」ボタン F-12）。作成では渡さない */
  footerStart?: ReactNode
}

/**
 * タスクの入力用の小窓（S-02。あとで編集 S-03 にも使う）。ブラウザ標準の <dialog> を使う。
 * - 開いたらタイトル欄へカーソルを移す。閉じたら、ブラウザが開く前の場所（押したボタン）へ戻す（N-21）
 * - ×・キャンセル・Esc で閉じる。外側のクリックでは閉じない（showModal の決まり。R-03）
 */
export function TaskFormDialog({
  heading,
  submitLabel,
  pendingLabel,
  initialValues,
  labels,
  labelsFailed,
  pending,
  error,
  onSubmit,
  onClose,
  footerStart,
}: TaskFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const headingId = useId()
  const [values, setValues] = useState(initialValues)
  // 送ってから結果が出るまで true。画面の描き直しを待たずに分かるよう、ref で持つ
  const submittingRef = useRef(false)
  const canSubmit = canSubmitTaskForm(values) && !pending

  useEffect(() => {
    const dialog = dialogRef.current
    // 開発中の React は、確かめのために表示をやり直すことがある。もう開いていたら、開き直さない
    if (dialog && !dialog.open) {
      dialog.showModal()
      titleRef.current?.focus()
    }
  }, [])

  function close() {
    dialogRef.current?.close()
  }

  // Esc を押したとき。送っている間は閉じない（閉じても保存は止まらず、作られたことが分かりにくいため）
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    if (pending || submittingRef.current) {
      event.preventDefault()
    }
  }

  // 小窓が閉じたとき。Esc の連打では、ブラウザが止めずに閉じることがある。送っている間なら開き直して、結果を見せる
  function handleClose() {
    if (submittingRef.current) {
      dialogRef.current?.showModal()
      return
    }
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) {
      return
    }
    submittingRef.current = true
    const succeeded = await onSubmit(values)
    submittingRef.current = false
    if (succeeded) {
      close()
      return
    }
    // 送っている間、押したボタンが押せなくなり、カーソルの場所が分からなくなる。タイトル欄に戻す
    titleRef.current?.focus()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onCancel={handleCancel}
      onClose={handleClose}
      className="m-auto w-full max-w-lg rounded-xl bg-white p-0 text-ink shadow-xl backdrop:bg-black/50"
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 id={headingId} className="m-0 text-lg font-bold">
            {heading}
          </h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            disabled={pending}
            className="rounded-md px-2 py-1 text-lg leading-none text-subtle hover:bg-column disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <TaskFormFields
          values={values}
          onChange={setValues}
          labels={labels}
          labelsFailed={labelsFailed}
          titleRef={titleRef}
        />

        {error !== null && (
          <p
            role="alert"
            className="m-0 rounded-md bg-danger-bg px-3 py-2 text-sm font-bold text-danger"
          >
            {errorMessage(error)}
          </p>
        )}

        <div className="flex items-center gap-2">
          {footerStart}
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="ml-auto rounded-md px-4 py-2 text-sm font-semibold hover:bg-column disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? pendingLabel : submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
