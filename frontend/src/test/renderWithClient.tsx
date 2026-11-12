import { QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createQueryClient } from '../api/queryClient'

/** テストごとに新しい QueryClient で包んで表示する（前のテストの読み込み結果を持ち越さない） */
export function renderWithClient(ui: ReactElement): RenderResult {
  const client = createQueryClient({ retry: false })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}
