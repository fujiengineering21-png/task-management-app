import { useMemo, useRef, useState } from 'react'
import { useBoards, useBoardTasks } from '../../api/queries'
import type { Task, TaskStatus } from '../../api/schemas'
import { LoadError, Loading } from '../../components/StatusMessage'
import { COLUMNS } from '../../lib/constants'
import { filterByKeyword, hasKeyword } from '../../lib/filterByKeyword'
import { groupByStatus } from '../../lib/groupByStatus'
import { BoardTabs } from './BoardTabs'
import { Column } from './Column'
import { CreateTaskModal } from './CreateTaskModal'
import { EditTaskModal } from './EditTaskModal'
import { KeywordSearch } from './KeywordSearch'

/** ボード画面（S-01）。ボードの一覧を読み、選んでいるボードのタスクを3カラムに並べる */
export function BoardScreen() {
  const boardsQuery = useBoards()
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined)
  // 検索の文字は保存しない。再読み込みすると消える（R-22）
  const [keyword, setKeyword] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  // 作成の小窓を開いているときは、「タスクを追加」を押したカラム。閉じているときは null
  const [creatingStatus, setCreatingStatus] = useState<TaskStatus | null>(null)
  // 編集の小窓を開いているときは、押したカードのタスク（開いたときの写し）。閉じているときは null
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // タブは position の順（0＝左）。届いた一覧は変えずに、並べ替えた写しを使う
  const boards = useMemo(
    () => [...(boardsQuery.data ?? [])].sort((a, b) => a.position - b.position),
    [boardsQuery.data],
  )
  // 最初は一番左のボードを開く。選んでいたボードが読み直した一覧にないときも、一番左に戻す
  const currentId = boards.some((board) => board.id === selectedId) ? selectedId : boards[0]?.id
  const tasksQuery = useBoardTasks(currentId)

  // ボードを切り替えたら、検索を解除する（R-22）。開いているタブをもう一度押したときは、そのまま
  function selectBoard(boardId: number) {
    if (boardId === currentId) {
      return
    }
    setSelectedId(boardId)
    setKeyword('')
  }

  // 「解除」のボタンは押すと消えるので、フォーカスを検索欄に戻す（キーボードで続けて操作できるように）
  function clearKeyword() {
    setKeyword('')
    searchInputRef.current?.focus()
  }

  // 編集の小窓が閉じたとき。ふつうはブラウザが、押したカードへカーソルを戻す。
  // ただしカラムを変えて保存すると、カードが別のカラムで作り直され、戻り先がなくなる。
  // そのときは、画面が描き直されたあとに、移ったカードへカーソルを当てる
  function closeEditing(saved: Task | null) {
    setEditingTask(null)
    if (saved === null) {
      return
    }
    setTimeout(() => {
      if (document.activeElement !== document.body) {
        return
      }
      document.querySelector<HTMLElement>(`[data-task-id="${saved.id}"] button`)?.focus()
    }, 0)
  }

  // 削除が済んだとき。カードがなくなるので、そのカラムの「タスクを追加」へカーソルを置く
  // （絞り込み中でボタンがないときは、何もしない）
  function finishDeleting(deleted: Task) {
    setEditingTask(null)
    const column = COLUMNS.find((item) => item.status === deleted.status)
    if (column === undefined) {
      return
    }
    setTimeout(() => {
      document
        .querySelector<HTMLElement>(`button[aria-label="タスクを追加（${column.title}）"]`)
        ?.focus()
    }, 0)
  }

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
          <KeywordSearch ref={searchInputRef} value={keyword} onChange={setKeyword} />
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
          onClearKeyword={clearKeyword}
          onAddTask={setCreatingStatus}
          onOpenTask={setEditingTask}
        />
      </main>
      {creatingStatus !== null && (
        <CreateTaskModal
          // 開いている間に表示中のボードが変わったら、選んだラベルが混ざらないよう作り直す
          key={currentId}
          boardId={currentId}
          initialStatus={creatingStatus}
          onClose={() => setCreatingStatus(null)}
        />
      )}
      {editingTask !== null && (
        <EditTaskModal
          key={`${currentId}-${editingTask.id}`}
          boardId={currentId}
          task={editingTask}
          onClose={closeEditing}
          onDeleted={finishDeleting}
        />
      )}
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
  /** 「タスクを追加」を押したカラムを知らせる */
  onAddTask: (status: TaskStatus) => void
  /** 押したカードのタスクを知らせる */
  onOpenTask: (task: Task) => void
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
  onAddTask,
  onOpenTask,
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
      <SearchStatus
        filtering={filtering}
        keyword={keyword.trim()}
        visibleCount={visibleTasks.length}
        totalCount={tasks.length}
        onClear={onClearKeyword}
      />
      <div className="flex items-start gap-3">
        {COLUMNS.map((column) => (
          <Column
            key={column.status}
            title={column.title}
            tasks={grouped[column.status]}
            currentYear={currentYear}
            totalCount={filtering ? allGrouped[column.status].length : undefined}
            // 絞り込み中は作成できない（隠れているタスクとの順番が決められないため R-20）
            onAdd={filtering ? undefined : () => onAddTask(column.status)}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </div>
  )
}

interface SearchStatusProps {
  filtering: boolean
  keyword: string
  visibleCount: number
  totalCount: number
  onClear: () => void
}

/**
 * 絞り込み中であることと、何件中何件を出しているかの表示（R-20）。「解除」で全部の表示に戻す。
 * 読み上げの場所（role="status"）は、あとから入れると読み上げられないことがあるので、いつも置いておき、中身だけを変える。
 * 絞り込んでいないときは、画面からは隠す（場所も取らない）
 */
function SearchStatus({
  filtering,
  keyword,
  visibleCount,
  totalCount,
  onClear,
}: SearchStatusProps) {
  return (
    <div className={filtering ? 'flex items-center gap-3 text-sm text-white' : 'sr-only'}>
      <p role="status" className="m-0">
        {filtering && `「${keyword}」で絞り込み中（全${totalCount}件中${visibleCount}件）`}
      </p>
      {filtering && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
        >
          解除
        </button>
      )}
    </div>
  )
}
