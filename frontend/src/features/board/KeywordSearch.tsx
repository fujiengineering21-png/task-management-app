interface KeywordSearchProps {
  value: string
  onChange: (keyword: string) => void
}

/** キーワードの入力欄（F-60）。入力するたびに、開いているボードのタスクを画面の中で絞り込む */
export function KeywordSearch({ value, onChange }: KeywordSearchProps) {
  return (
    <input
      type="search"
      aria-label="キーワードで検索"
      placeholder="キーワードで検索"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-56 rounded-md bg-white px-3 py-1.5 text-sm text-ink placeholder:text-subtle"
    />
  )
}
