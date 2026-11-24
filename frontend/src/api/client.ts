import type { z } from 'zod'
import { envelopeSchema } from './schemas'

const CONNECTION_MESSAGE = 'サーバーに接続できません'
const SERVER_ERROR_MESSAGE = 'サーバーでエラーが起きました'
const INVALID_RESPONSE_MESSAGE = 'サーバーから届いたデータの形が正しくありません'

/** サーバーの返事を待つ最大の時間（ミリ秒）。過ぎたらあきらめて「サーバーに接続できません」にする */
export const REQUEST_TIMEOUT_MS = 15_000

/** サーバーにつながらない、または API の返事ではないものが届いた（R-26） */
export class ConnectionError extends Error {
  constructor() {
    super(CONNECTION_MESSAGE)
    this.name = 'ConnectionError'
  }
}

/** サーバーが「失敗」を返した。message はサーバーの日本語のメッセージ */
export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/**
 * API とやりとりして、共通の包みをはずし、data が schema の形かを確かめて返す。
 * - fetch の失敗、時間切れ（REQUEST_TIMEOUT_MS）、JSON でない返事（バックエンドが止まっているときに Vite の中継が返す中身の空の 500 など）、
 *   包みの形でない返事 → ConnectionError
 * - success:false → ApiError（サーバーの日本語のメッセージ）
 * - data の形が違う → ApiError（決まった日本語の文。英語の細かい内容は画面に出さない）
 */
async function requestJson<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  // テスト（jsdom）でも動くように、相対パスを画面の住所を基準にした完全な URL に直す
  const url = new URL(path, window.location.origin)

  // 返事が来ないまま止まると、作成の小窓が「作成中…」のまま閉じられなくなるので、時間を決めて打ち切る
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let body: unknown
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    body = await response.json()
  } catch {
    throw new ConnectionError()
  } finally {
    clearTimeout(timer)
  }

  const envelope = envelopeSchema.safeParse(body)
  if (!envelope.success) {
    throw new ConnectionError()
  }
  if (!envelope.data.success) {
    const error = envelope.data.error
    throw new ApiError(error?.code ?? 'UNKNOWN', error?.message ?? SERVER_ERROR_MESSAGE)
  }

  const data = schema.safeParse(envelope.data.data)
  if (!data.success) {
    throw new ApiError('INVALID_RESPONSE', INVALID_RESPONSE_MESSAGE)
  }
  return data.data
}

/** API から読む（GET） */
export function getJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  return requestJson(path, schema)
}

/** API に JSON を送る（POST）。返ってきた data を schema で確かめて返す */
export function postJson<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  return requestJson(path, schema, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** 画面に出すエラーの文。知らない種類のエラーは、つながらないものとして扱う */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : CONNECTION_MESSAGE
}
