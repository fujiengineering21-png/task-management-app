import type { Board } from '../../api/schemas'

interface BoardTabsProps {
  boards: Board[]
  selectedId: number
  onSelect: (boardId: number) => void
}

/** ボードのタブ（F-02）。選んでいるタブは aria-pressed で伝える。名前の変更（F-03）は、あとの段階で作る */
export function BoardTabs({ boards, selectedId, onSelect }: BoardTabsProps) {
  return (
    <nav aria-label="ボード" className="flex gap-1">
      {boards.map((board) => {
        const selected = board.id === selectedId
        return (
          <button
            key={board.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(board.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              selected ? 'bg-white text-ink' : 'text-white hover:bg-white/20'
            }`}
          >
            {board.name}
          </button>
        )
      })}
    </nav>
  )
}
