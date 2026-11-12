import { useMemo, useState } from 'react'
import { useBoards, useBoardTasks } from '../../api/queries'
import type { Task } from '../../api/schemas'
import { LoadError, Loading } from '../../components/StatusMessage'
import { COLUMNS } from '../../lib/constants'
import { groupByStatus } from '../../lib/groupByStatus'
import { BoardTabs } from './BoardTabs'
import { Column } from './Column'

/** ボード画面（S-01）。ボードの一覧を読み、選んでいるボードのタスクを3カラムに並べる */
export function BoardScreen() {
  const boardsQuery = useBoards()
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)

  // タブは position の順（0＝左）。届いた一覧は変えずに、並べ替えた写しを使う
  const boards = useMemo(
    () => [...(boardsQuery.data ?? [])].sort((a, b) => a.position - b.position),
    [boardsQuery.data],
  )
  // 最初は一番左のボードを開く
  const currentId = selectedId ?? boards[0]?.id
  const tasksQuery = useBoardTasks(currentId)

  if (boardsQuery.isPending) {
    return <Loading />
  }
  // タブに戻ったときの読み直しに失敗しても、表示中のボードは消さない（data があるうちは出し続ける）
  if (!boardsQuery.data) {
    return (
      <LoadError
        error={boardsQuery.error}
        onRetry={() => void boardsQuery.refetch()}
        retrying={boardsQuery.isFetching}
      />
    )
  }
  if (currentId === undefined) {
    return <p className="m-0 p-6 text-white">ボードがありません</p>
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-4 bg-black/30 px-4 py-2 text-white">
        <h1 className="m-0 text-lg font-bold">TaskBoard</h1>
        <BoardTabs boards={boards} selectedId={currentId} onSelect={setSelectedId} />
      </header>
      <main className="flex-1 overflow-x-auto p-4">
        <BoardBody
          tasks={tasksQuery.data}
          isPending={tasksQuery.isPending}
          error={tasksQuery.error}
          isFetching={tasksQuery.isFetching}
          onRetry={() => void tasksQuery.refetch()}
        />
      </main>
    </div>
  )
}

interface BoardBodyProps {
  tasks: Task[] | undefined
  isPending: boolean
  error: unknown
  isFetching: boolean
  onRetry: () => void
}

/** ボードの中身（3カラム）。読み込み中・エラーのときは、その表示にする */
function BoardBody({ tasks, isPending, error, isFetching, onRetry }: BoardBodyProps) {
  if (isPending) {
    return <Loading />
  }
  if (!tasks) {
    return <LoadError error={error} onRetry={onRetry} retrying={isFetching} />
  }

  const grouped = groupByStatus(tasks)
  // 「今日」はブラウザの日付で決める（技術スタック 7章）
  const currentYear = new Date().getFullYear()

  return (
    <div className="flex items-start gap-3">
      {COLUMNS.map((column) => (
        <Column
          key={column.status}
          title={column.title}
          tasks={grouped[column.status]}
          currentYear={currentYear}
        />
      ))}
    </div>
  )
}
