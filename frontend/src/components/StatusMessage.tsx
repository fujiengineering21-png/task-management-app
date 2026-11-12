import { errorMessage } from '../api/client'

/** 読み込み中の表示（F-52） */
export function Loading() {
  return (
    <p role="status" className="m-0 p-6 text-white">
      読み込み中
    </p>
  )
}

interface LoadErrorProps {
  error: unknown
  onRetry: () => void
  retrying: boolean
}

/** 読み込めなかったときの表示と「再読み込み」ボタン（F-52・R-26）。読み直している間はボタンを押せない */
export function LoadError({ error, onRetry, retrying }: LoadErrorProps) {
  return (
    <div role="alert" className="m-6 max-w-md rounded-lg bg-white p-4 shadow">
      <p className="m-0 font-bold text-danger">{errorMessage(error)}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
      >
        再読み込み
      </button>
    </div>
  )
}
