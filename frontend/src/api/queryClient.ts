import { QueryClient } from '@tanstack/react-query'

interface QueryClientOptions {
  /** 失敗したときにやり直す回数。テストでは false（すぐにエラーを出す） */
  retry?: number | false
}

/** サーバーのデータの読み込みを受け持つ部品を作る（アプリとテストで同じ設定を使う） */
export function createQueryClient(options: QueryClientOptions = {}): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 1回だけやり直してから、エラーの画面を出す（約1秒後）
        retry: options.retry ?? 1,
        // ブラウザのタブに戻ってきたら、最新のデータを読み直す（F-51）
        refetchOnWindowFocus: true,
      },
    },
  })
}
