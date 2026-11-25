import { useEffect, useId, useRef, type SyntheticEvent } from 'react'
import { errorMessage } from '../../api/client'

interface DeleteTaskDialogProps {
  /** 消すタスクの名前。小窓に出す（R-13） */
  taskTitle: string
  /** 削除を送っている間は true。ボタンを押せなくし、Esc でも閉じない */
  pending: boolean
  /** 削除に失敗したときのエラー。なければ null */
  error: unknown
  /** 「削除する」を押したとき */
  onConfirm: () => void
  /** 「キャンセル」・Esc で閉じたとき（編集の小窓に戻る） */
  onCancel: () => void
}

/**
 * タスクの削除の確認（S-04・F-12）。編集の小窓（S-03）の上に重ねて開く。
 * うっかり消さないよう、開いたらカーソルを「キャンセル」に置く。閉じると、ブラウザが「削除」ボタンへカーソルを戻す
 */
export function DeleteTaskDialog({
  taskTitle,
  pending,
  error,
  onConfirm,
  onCancel,
}: DeleteTaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const headingId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    // 開発中の React は、確かめのために表示をやり直すことがある。もう開いていたら、開き直さない
    if (dialog && !dialog.open) {
      dialog.showModal()
      cancelRef.current?.focus()
    }
  }, [])

  // 削除に失敗したら、カーソルを「キャンセル」に戻す。
  // 「削除する」を押すとボタンが一時的に押せなくなり、ブラウザがカーソルの場所を見失うため
  useEffect(() => {
    if (error !== null) {
      cancelRef.current?.focus()
    }
  }, [error])

  // Esc を押したとき。送っている間は閉じない
  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    if (pending) {
      event.preventDefault()
    }
  }

  // 閉じたとき。Esc の連打でブラウザが止めずに閉じたときも、送っている間なら開き直す
  function handleClose() {
    if (pending) {
      dialogRef.current?.showModal()
      return
    }
    onCancel()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onCancel={handleCancel}
      onClose={handleClose}
      className="m-auto w-full max-w-sm rounded-xl bg-white p-0 text-ink shadow-xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-3 p-5">
        <h2 id={headingId} className="m-0 text-base font-bold">
          このタスクを削除しますか？
        </h2>
        <p className="m-0 text-sm break-words">「{taskTitle}」</p>
        <p className="m-0 text-sm text-subtle">削除すると元に戻せません。</p>

        {error !== null && (
          <p
            role="alert"
            className="m-0 rounded-md bg-danger-bg px-3 py-2 text-sm font-bold text-danger"
          >
            {errorMessage(error)}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={pending}
            className="rounded-md px-4 py-2 text-sm font-semibold hover:bg-column disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? '削除中…' : '削除する'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
