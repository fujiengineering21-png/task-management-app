import { http, HttpResponse } from 'msw/http'
import { boards, tasksByBoard } from './fixtures'

/** 成功のときの共通の包み（API設計 1.1） */
export function ok(data: unknown): Response {
  return HttpResponse.json({ success: true, data, error: null, meta: null })
}

/** 失敗のときの共通の包み */
export function fail(status: number, code: string, message: string): Response {
  return HttpResponse.json(
    { success: false, data: null, error: { code, message }, meta: null },
    { status },
  )
}

// 「*」はどのホストでも合うようにするため（テストの URL の基準に左右されない）
export const handlers = [
  http.get('*/api/boards', () => ok(boards)),
  http.get('*/api/boards/:boardId/tasks', ({ params }) =>
    ok(tasksByBoard[Number(params.boardId)] ?? []),
  ),
]
