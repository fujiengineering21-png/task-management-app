import type { Task } from '../../api/schemas'
import { PRIORITY_CLASSES, PRIORITY_NAMES } from '../../lib/constants'
import { formatDue } from '../../lib/formatDue'
import { LabelChip } from './LabelChip'

interface TaskCardProps {
  task: Task
  /** 期限の表示で「今年」とみなす年（ブラウザの日付で決める。技術スタック 7章） */
  currentYear: number
  /** カードを押したとき（編集の小窓を開く F-11）。渡さないと、表示だけのカードになる */
  onOpen?: () => void
}

/**
 * カード（R-08）。上から「ラベル」「✓＋タイトル」「優先度・期限・説明ありマーク」。設定していないものは出さない。
 * onOpen を渡すと、カードの中身がボタンになり、クリックでもキーボード（Enter・Space）でも開ける。
 * あとで置くチェックボックス（R-12）は、ボタンの中に入れない（ボタンの中にボタンは置けないため）。
 */
export function TaskCard({ task, currentYear, onOpen }: TaskCardProps) {
  return (
    <li
      // 編集でカラムが変わったとき、移ったカードを探してカーソルを当てるための目印
      data-task-id={task.id}
      className={`rounded-lg shadow-sm ring-1 ring-black/5 ${
        task.completed ? 'bg-card-done opacity-70' : 'bg-white'
      }`}
    >
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="block w-full cursor-pointer rounded-lg p-2 text-left hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <CardBody task={task} currentYear={currentYear} />
        </button>
      ) : (
        <div className="p-2">
          <CardBody task={task} currentYear={currentYear} />
        </div>
      )}
    </li>
  )
}

interface CardBodyProps {
  task: Task
  currentYear: number
}

/** カードの中身。ボタンの中にも入れられるよう、文字の部品（span）だけで組み立てる */
function CardBody({ task, currentYear }: CardBodyProps) {
  const hasMeta = Boolean(task.priority || task.dueDate || task.description)

  return (
    <>
      {task.labels.length > 0 && (
        <span className="mb-1.5 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
        </span>
      )}

      <span className="flex items-start gap-2">
        <span
          role="img"
          aria-label={task.completed ? '完了' : '未完了'}
          className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 text-[10px] leading-none ${
            task.completed ? 'border-check bg-check text-white' : 'border-subtle'
          }`}
        >
          {task.completed ? '✓' : ''}
        </span>
        {/* 長いタイトルも省略せず、折り返して全文を出す（R-10） */}
        <span className={`text-sm break-words ${task.completed ? 'text-subtle line-through' : ''}`}>
          {task.title}
        </span>
      </span>

      {hasMeta && (
        <span className="mt-1.5 flex flex-wrap items-center gap-2 pl-6 text-xs text-subtle">
          {task.priority && (
            <span
              className={`rounded px-1.5 py-0.5 font-semibold ${PRIORITY_CLASSES[task.priority]}`}
            >
              優先:{PRIORITY_NAMES[task.priority]}
            </span>
          )}
          {task.dueDate && (
            <span title={`期限 ${task.dueDate}`}>〆{formatDue(task.dueDate, currentYear)}</span>
          )}
          {task.description && (
            <span role="img" aria-label="説明あり">
              📝
            </span>
          )}
        </span>
      )}
    </>
  )
}
