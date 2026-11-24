import type { Task } from '../../api/schemas'
import { TaskCard } from './TaskCard'

interface ColumnProps {
  title: string
  tasks: Task[]
  currentYear: number
  /** 絞り込み中だけ渡す、このカラムの全体の件数。渡すと件数を「表示中／全体」で出す（R-21） */
  totalCount?: number
  /** 「＋ タスクを追加」を押したとき。渡さないとボタンを出さない（絞り込み中 R-20） */
  onAdd?: () => void
}

/** カラム。見出しにカラム名と件数を出す（F-05）。0件でも枠は出す */
export function Column({ title, tasks, currentYear, totalCount, onAdd }: ColumnProps) {
  const count = totalCount === undefined ? `${tasks.length}` : `${tasks.length}/${totalCount}`
  return (
    <section className="flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-column p-2">
      <h2 className="m-0 px-2 pt-1 text-sm font-bold">
        {title} ({count})
      </h2>
      <ol aria-label={`${title}のタスク`} className="m-0 flex list-none flex-col gap-2 p-0">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} currentYear={currentYear} />
        ))}
      </ol>
      {onAdd && (
        <button
          type="button"
          // 3つのカラムのボタンを読み上げで見分けられるように、カラム名を足す（見える文字も含める）
          aria-label={`タスクを追加（${title}）`}
          onClick={onAdd}
          className="rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-subtle hover:bg-black/5"
        >
          ＋ タスクを追加
        </button>
      )}
    </section>
  )
}
