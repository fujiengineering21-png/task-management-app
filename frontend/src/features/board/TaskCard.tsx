import type { Task } from '../../api/schemas'
import { PRIORITY_CLASSES, PRIORITY_NAMES } from '../../lib/constants'
import { formatDue } from '../../lib/formatDue'
import { LabelChip } from './LabelChip'

interface TaskCardProps {
  task: Task
  /** 期限の表示で「今年」とみなす年（ブラウザの日付で決める。技術スタック 7章） */
  currentYear: number
}

/**
 * カード（R-08）。上から「ラベル」「✓＋タイトル」「優先度・期限・説明ありマーク」。設定していないものは出さない。
 * 今は表示だけ（✓ の付け外し・編集は、あとの段階で作る）。
 */
export function TaskCard({ task, currentYear }: TaskCardProps) {
  const hasMeta = Boolean(task.priority || task.dueDate || task.description)

  return (
    <li
      className={`rounded-lg p-2 shadow-sm ring-1 ring-black/5 ${
        task.completed ? 'bg-card-done opacity-70' : 'bg-white'
      }`}
    >
      {task.labels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
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
      </div>

      {hasMeta && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-6 text-xs text-subtle">
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
        </div>
      )}
    </li>
  )
}
