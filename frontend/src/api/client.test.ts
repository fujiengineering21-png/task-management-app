import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { fail, ok } from '../test/handlers'
import { server } from '../test/server'
import { ApiError, ConnectionError, getJson } from './client'

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
