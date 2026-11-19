import type { LabelColor, Priority, TaskStatus } from '../api/schemas'

interface ColumnDefinition {
  status: TaskStatus
  title: string
}

/** カラムは3つで固定（F-01・F-06） */
export const COLUMNS: readonly ColumnDefinition[] = [
  { status: 'todo', title: '未着手' },
  { status: 'doing', title: '作業中' },
  { status: 'done', title: '完了' },
]

/** 優先度の名前（F-13） */
export const PRIORITY_NAMES: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

// Tailwind は組み立てたクラス名を見つけられないので、クラス名は完全な文字列で書く
/** 優先度のバッジの色 */
export const PRIORITY_CLASSES: Record<Priority, string> = {
  high: 'bg-priority-high-bg text-priority-high',
  medium: 'bg-priority-medium-bg text-priority-medium',
  low: 'bg-priority-low-bg text-priority-low',
}

/** ラベルの色の日本語名（F-41。名前のないラベルの読み上げに使う） */
export const LABEL_COLOR_NAMES: Record<LabelColor, string> = {
  green: '緑',
  yellow: '黄',
  orange: 'オレンジ',
  red: '赤',
  purple: '紫',
  blue: '青',
}

/** ラベルの色（文字の色は、背景の明るさに合わせて読みやすいほう） */
export const LABEL_COLOR_CLASSES: Record<LabelColor, string> = {
  green: 'bg-label-green text-white',
  yellow: 'bg-label-yellow text-ink',
  orange: 'bg-label-orange text-ink',
  red: 'bg-label-red text-white',
  purple: 'bg-label-purple text-white',
  blue: 'bg-label-blue text-white',
}

/** 画面の一番上に常に出す案内（F-54） */
export const DEMO_NOTICE =
  '公開デモです。誰でも編集でき、毎日午前4時に見本データへ戻ります。個人情報や本物の予定は入力しないでください'
