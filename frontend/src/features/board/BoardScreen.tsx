import { useMemo, useState } from 'react'
import { useBoards, useBoardTasks } from '../../api/queries'
import type { Task } from '../../api/schemas'
import { LoadError, Loading } from '../../components/StatusMessage'
import { COLUMNS } from '../../lib/constants'
import { filterByKeyword, hasKeyword } from '../../lib/filterByKeyword'
import { groupByStatus } from '../../lib/groupByStatus'
import { BoardTabs } from './BoardTabs'
import { Column } from './Column'
import { KeywordSearch } from './KeywordSearch'

/** ボード画面（S-01）。ボードの一覧を読み、選んでいるボードのタスクを3カラムに並べる */
export function BoardScreen() {
  const boardsQuery = useBoards()
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
  // 検索の文字は保存しない。再読み込みすると消える（R-22）
  const [keyword, setKeyword] = useState('')

  // ボードを切り替えたら、検索を解除する（R-22）
  function selectBoard(boardId: number) {
    setSelectedId(boardId)
    setKeyword('')
  }

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
        <BoardTabs boards={boards} selectedId={currentId} onSelect={selectBoard} />
        <div className="ml-auto">
          <KeywordSearch value={keyword} onChange={setKeyword} />
        </div>
      </header>
      <main className="flex-1 overflow-x-auto p-4">
        <BoardBody
          tasks={tasksQuery.data}
          isPending={tasksQuery.isPending}
          error={tasksQuery.error}
          isFetching={tasksQuery.isFetching}
          onRetry={() => void tasksQuery.refetch()}
          keyword={keyword}
          onClearKeyword={() => setKeyword('')}
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
  keyword: string
  onClearKeyword: () => void
}

/** ボードの中身（3カラム）。読み込み中・エラーのときは、その表示にする */
function BoardBody({
  tasks,
  isPending,
  error,
  isFetching,
  onRetry,
  keyword,
  onClearKeyword,
}: BoardBodyProps) {
  if (isPending) {
    return <Loading />
  }
  if (!tasks) {
    return <LoadError error={error} onRetry={onRetry} retrying={isFetching} />
  }

  const filtering = hasKeyword(keyword)
  const visibleTasks = filterByKeyword(tasks, keyword)
  const grouped = groupByStatus(visibleTasks)
  const allGrouped = groupByStatus(tasks)
  // 「今日」はブラウザの日付で決める（技術スタック 7章）
  const currentYear = new Date().getFullYear()

  return (
    <div className="flex flex-col gap-3">
      {filtering && (
        <SearchStatus
          keyword={keyword.trim()}
          visibleCount={visibleTasks.length}
          totalCount={tasks.length}
          onClear={onClearKeyword}
        />
      )}
      <div className="flex items-start gap-3">
        {COLUMNS.map((column) => (
          <Column
            key={column.status}
            title={column.title}
            tasks={grouped[column.status]}
            currentYear={currentYear}
            totalCount={filtering ? allGrouped[column.status].length : undefined}
          />
        ))}
      </div>
    </div>
  )
}

interface SearchStatusProps {
  keyword: string
  visibleCount: number
  totalCount: number
  onClear: () => void
}

/** 絞り込み中であることと、何件中何件を出しているかの表示（R-20）。「解除」で全部の表示に戻す */
function SearchStatus({ keyword, visibleCount, totalCount, onClear }: SearchStatusProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-white">
      <p role="status" className="m-0">
        「{keyword}」で絞り込み中（全{totalCount}件中{visibleCount}件）
      </p>
      <button
        type="button"
        onClick={onClear}
        className="rounded-md bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
      >
        解除
      </button>
    </div>
  )
}
