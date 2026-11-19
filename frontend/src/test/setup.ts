import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

// 用意していない URL への通信は、テストの失敗にする（気づかずに本物へ通信しないように）
// MSW 3 では、MSW 2 の onUnhandledRequest が onUnhandledFrame に名前が変わった
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
