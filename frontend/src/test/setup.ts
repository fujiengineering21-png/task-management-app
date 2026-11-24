import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

// jsdom には <dialog> の showModal・close がないので、最小限の代わりを入れる。
// 開いた・閉じた（open の属性）と close の合図だけをまねる。Esc で閉じる・フォーカスを戻すなどは、
// 本物のブラウザで確かめる
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    // 本物と同じく、もう閉じていたら何もしない（close の合図も出さない）
    if (!this.hasAttribute('open')) {
      return
    }
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

// 用意していない URL への通信は、テストの失敗にする（気づかずに本物へ通信しないように）
// MSW 3 では、MSW 2 の onUnhandledRequest が onUnhandledFrame に名前が変わった
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
