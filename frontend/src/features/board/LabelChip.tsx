import type { Label } from '../../api/schemas'
import { LABEL_COLOR_CLASSES, LABEL_COLOR_NAMES } from '../../lib/constants'

interface LabelChipProps {
  label: Label
}

/** ラベル。色＋名前で出す。名前のないラベルは色だけの帯にする（R-09） */
export function LabelChip({ label }: LabelChipProps) {
  const colorClass = LABEL_COLOR_CLASSES[label.color]

  if (label.name === '') {
    return (
      <span
        role="img"
        aria-label={`${LABEL_COLOR_NAMES[label.color]}（名前なし）`}
        className={`block h-2 w-10 rounded ${colorClass}`}
      />
    )
  }
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${colorClass}`}>{label.name}</span>
  )
}
