import { useId, type Ref } from 'react'
import { prioritySchema, taskStatusSchema, type Label } from '../../api/schemas'
import {
  COLUMNS,
  DESCRIPTION_MAX_LENGTH,
  DUE_DATE_MAX,
  DUE_DATE_MIN,
  PRIORITY_NAMES,
  TITLE_MAX_LENGTH,
} from '../../lib/constants'
import type { TaskFormValues } from '../../lib/taskForm'
import { LabelChip } from './LabelChip'

interface TaskFormFieldsProps {
  values: TaskFormValues
  /** 新しい値を丸ごと渡す（元の値は書き換えない） */
  onChange: (values: TaskFormValues) => void
  labels: Label[] | undefined
  labelsFailed: boolean
  /** 小窓を開いたときに、カーソルをタイトル欄へ移すために使う */
  titleRef: Ref<HTMLInputElement>
}

const FIELD_CLASS = 'w-full rounded-md border border-line px-3 py-2 text-sm'
const CAPTION_CLASS = 'text-sm font-semibold'

/** タスクの入力欄（画面設計 3.3 の「入力項目」）。タイトル・説明・カラム・優先度・期限・ラベル */
export function TaskFormFields({
  values,
  onChange,
  labels,
  labelsFailed,
  titleRef,
}: TaskFormFieldsProps) {
  const ids = {
    title: useId(),
    description: useId(),
    status: useId(),
    priority: useId(),
    dueDate: useId(),
  }

  function update<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  function toggleLabel(labelId: number) {
    const labelIds = values.labelIds.includes(labelId)
      ? values.labelIds.filter((id) => id !== labelId)
      : [...values.labelIds, labelId]
    update('labelIds', labelIds)
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor={ids.title} className={CAPTION_CLASS}>
          タイトル（必須）
        </label>
        <input
          ref={titleRef}
          id={ids.title}
          type="text"
          aria-required="true"
          maxLength={TITLE_MAX_LENGTH}
          value={values.title}
          onChange={(event) => update('title', event.target.value)}
          className={FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.description} className={CAPTION_CLASS}>
          説明
        </label>
        <textarea
          id={ids.description}
          rows={3}
          maxLength={DESCRIPTION_MAX_LENGTH}
          value={values.description}
          onChange={(event) => update('description', event.target.value)}
          className={FIELD_CLASS}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.status} className={CAPTION_CLASS}>
            カラム
          </label>
          <select
            id={ids.status}
            value={values.status}
            onChange={(event) => update('status', taskStatusSchema.parse(event.target.value))}
            className={FIELD_CLASS}
          >
            {COLUMNS.map((column) => (
              <option key={column.status} value={column.status}>
                {column.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.priority} className={CAPTION_CLASS}>
            優先度
          </label>
          <select
            id={ids.priority}
            value={values.priority}
            onChange={(event) =>
              update(
                'priority',
                event.target.value === '' ? '' : prioritySchema.parse(event.target.value),
              )
            }
            className={FIELD_CLASS}
          >
            <option value="">なし</option>
            {prioritySchema.options.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_NAMES[priority]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.dueDate} className={CAPTION_CLASS}>
            期限
          </label>
          <input
            id={ids.dueDate}
            type="date"
            min={DUE_DATE_MIN}
            max={DUE_DATE_MAX}
            value={values.dueDate}
            onChange={(event) => update('dueDate', event.target.value)}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className={`${CAPTION_CLASS} mb-1 p-0`}>ラベル</legend>
        <LabelChoices
          labels={labels}
          labelsFailed={labelsFailed}
          selectedIds={values.labelIds}
          onToggle={toggleLabel}
        />
      </fieldset>
    </>
  )
}

interface LabelChoicesProps {
  labels: Label[] | undefined
  labelsFailed: boolean
  selectedIds: number[]
  onToggle: (labelId: number) => void
}

/** ラベルの選択（複数可）。読み込めなくても、ラベルなしで作成はできる */
function LabelChoices({ labels, labelsFailed, selectedIds, onToggle }: LabelChoicesProps) {
  if (labelsFailed) {
    return (
      <p className="m-0 text-sm text-danger">
        ラベルを読み込めませんでした（ラベルなしで作成できます）
      </p>
    )
  }
  if (labels === undefined) {
    return <p className="m-0 text-sm text-subtle">読み込み中</p>
  }
  if (labels.length === 0) {
    return <p className="m-0 text-sm text-subtle">ラベルはありません</p>
  }
  return (
    <div className="flex flex-wrap gap-3">
      {labels.map((label) => (
        <label key={label.id} className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={selectedIds.includes(label.id)}
            onChange={() => onToggle(label.id)}
          />
          <LabelChip label={label} />
        </label>
      ))}
    </div>
  )
}
