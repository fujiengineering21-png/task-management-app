import type { Task } from '../api/schemas'

/** 比べる前にそろえる。全角と半角（ＡＢＣ → ABC）、大文字と小文字の違いをなくす */
function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase()
}

/** キーワードを空白（全角の空白も含む）で区切った言葉の一覧にする */
function toWords(keyword: string): string[] {
  return normalize(keyword)
    .split(/\s+/)
    .filter((word) => word !== '')
}

/** 絞り込みに使う言葉があるか（空や空白だけなら、絞り込まない） */
export function hasKeyword(keyword: string): boolean {
  return toWords(keyword).length > 0
}

/**
 * タイトルと説明の文字で、タスクを絞り込む（F-60）。
 * 空白で区切った言葉は、すべてを含むタスクだけを残す。キーワードが空なら全部を返す。元の一覧は変えない
 */
export function filterByKeyword(tasks: readonly Task[], keyword: string): Task[] {
  const words = toWords(keyword)
  if (words.length === 0) {
    return [...tasks]
  }
  return tasks.filter((task) => {
    const text = normalize(`${task.title}\n${task.description ?? ''}`)
    return words.every((word) => text.includes(word))
  })
}
