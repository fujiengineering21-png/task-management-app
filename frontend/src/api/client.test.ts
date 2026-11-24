import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { fail, ok } from '../test/handlers'
import { server } from '../test/server'
import { ApiError, ConnectionError, getJson, postJson, REQUEST_TIMEOUT_MS } from './client'

const schema = z.array(z.object({ id: z.number() }))

describe('getJson（API とのやりとり）', () => {
  it('成功したら、包みの中の data を返す', async () => {
    server.use(http.get('*/api/sample', () => ok([{ id: 1 }])))

    await expect(getJson('/api/sample', schema)).resolves.toEqual([{ id: 1 }])
  })

  it('サーバーにつながらないときは ConnectionError', async () => {
    server.use(http.get('*/api/sample', () => HttpResponse.error()))

    await expect(getJson('/api/sample', schema)).rejects.toBeInstanceOf(ConnectionError)
  })

  it('中身が空の 500（バックエンドが止まっているときの中継の返事）も ConnectionError', async () => {
    server.use(http.get('*/api/sample', () => new HttpResponse(null, { status: 500 })))

    await expect(getJson('/api/sample', schema)).rejects.toBeInstanceOf(ConnectionError)
  })

  it('包みの形でない JSON も ConnectionError', async () => {
    server.use(http.get('*/api/sample', () => HttpResponse.json({ hello: 'world' })))

    await expect(getJson('/api/sample', schema)).rejects.toBeInstanceOf(ConnectionError)
  })

  it('success:false なら、サーバーの日本語のメッセージで ApiError', async () => {
    server.use(
      http.get('*/api/sample', () => fail(404, 'BOARD_NOT_FOUND', 'ボードが見つかりません')),
    )

    const error = await getJson('/api/sample', schema).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('BOARD_NOT_FOUND')
    expect((error as ApiError).message).toBe('ボードが見つかりません')
  })

  it('data の形が違うときは、日本語の決まった文で ApiError', async () => {
    server.use(http.get('*/api/sample', () => ok([{ id: 'abc' }])))

    const error = await getJson('/api/sample', schema).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('サーバーから届いたデータの形が正しくありません')
  })
})

describe('postJson（API にデータを送る）', () => {
  it('中身を JSON にして POST で送り、包みの中の data を返す', async () => {
    let received: { method: string; contentType: string | null; body: unknown } | undefined
    server.use(
      http.post('*/api/sample', async ({ request }) => {
        received = {
          method: request.method,
          contentType: request.headers.get('Content-Type'),
          body: await request.json(),
        }
        return HttpResponse.json(
          { success: true, data: [{ id: 15 }], error: null, meta: null },
          { status: 201 },
        )
      }),
    )

    await expect(postJson('/api/sample', { title: 'a' }, schema)).resolves.toEqual([{ id: 15 }])
    expect(received).toEqual({
      method: 'POST',
      contentType: 'application/json',
      body: { title: 'a' },
    })
  })

  it('success:false なら、サーバーの日本語のメッセージで ApiError', async () => {
    server.use(
      http.post('*/api/sample', () =>
        fail(409, 'TASK_LIMIT_REACHED', 'これ以上タスクを作成できません'),
      ),
    )

    const error = await postJson('/api/sample', {}, schema).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('TASK_LIMIT_REACHED')
    expect((error as ApiError).message).toBe('これ以上タスクを作成できません')
  })

  it('サーバーにつながらないときは ConnectionError', async () => {
    server.use(http.post('*/api/sample', () => HttpResponse.error()))

    await expect(postJson('/api/sample', {}, schema)).rejects.toBeInstanceOf(ConnectionError)
  })
})

describe('時間切れ（サーバーが返事をしないとき）', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('決まった時間を過ぎても返事がなければ、あきらめて ConnectionError にする', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    server.use(
      http.post('*/api/sample', async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )

    const result = postJson('/api/sample', {}, schema).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)

    expect(await result).toBeInstanceOf(ConnectionError)
  })
})
