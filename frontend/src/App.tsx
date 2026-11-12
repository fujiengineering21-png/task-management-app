import { DemoBanner } from './components/DemoBanner'
import { BoardScreen } from './features/board/BoardScreen'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <BoardScreen />
    </div>
  )
}
