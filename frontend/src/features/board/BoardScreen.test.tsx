import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { focusManager } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw/http'
import { afterEach, describe, expect, it } from 'vitest'
import { makeTask, tasksByBoard } from '../../test/fixtures'
import { fail, ok } from '../../test/handlers'
import { renderWithClient } from '../../test/renderWithClient'
import { server } from '../../test/server'
import { BoardScreen } from './BoardScreen'

afterEach(() => {
  focusManager.setFocused(undefined)
})

function column(name: string): HTMLElement {
  return screen.getByRole('list', { name: `${name}のタスク` })
}

describe('BoardScreen（ボード画面 S-01）', () => {
  it('読み込み中は「読み込み中」を出し、そのあと3カラムと件数を出す（F-01・F-05・F-52）', async () => {
    renderWithClient(<BoardScreen />)

    expect(screen.getByRole('status')).toHaveTextContent('読み込み中')

    expect(await screen.findByRole('heading', { name: '未着手 (2)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '作業中 (1)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '完了 (1)' })).toBeInTheDocument()
  })

  it('最初は position が一番小さいボード（仕事）を開き、タスクをカラムに分けて出す', async () => {
    renderWithClient(<BoardScreen />)

    await screen.findByRole('heading', { name: '未着手 (2)' })

    expect(screen.getByRole('button', { name: '仕事' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(column('未着手')).getAllByRole('listitem')).toHaveLength(2)
    expect(within(column('未着手')).getByText('経費の精算を出す')).toBeInTheDocument()
    expect(within(column('作業中')).getByText('会議の資料をまとめる')).toBeInTheDocument()
    expect(within(column('完了')).getByText('取引先に日程の返事をする')).toBeInTheDocument()
  })

  it('タブで「プライベート」に切り替えると、そのボードのタスクを出す（F-02）', async () => {
    const user = userEvent.setup()
    renderWithClient(<BoardScreen />)
    await screen.findByText('経費の精算を出す')

    await user.click(screen.getByRole('button', { name: 'プライベート' }))

    expect(await screen.findByText('日用品を買う')).toBeInTheDocument()
    expect(screen.queryByText('経費の精算を出す')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'プライベート' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('heading', { name: '作業中 (0)' })).toBeInTheDocument()
  })

  it('タスクが0件のボードでも、3カラムを0件で出す', async () => {
    server.use(http.get('*/api/boards/:boardId/tasks', () => ok([])))
    renderWithClient(<BoardScreen />)

    expect(await screen.findByRole('heading', { name: '未着手 (0)' })).toBeInTheDocument()
    expect(within(column('完了')).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('サーバーにつながらないときは「サーバーに接続できません」と「再読み込み」を出し、押すと読み直す（R-26）', async () => {
    const user = userEvent.setup()
    server.use(http.get('*/api/boards', () => HttpResponse.error()))
    renderWithClient(<BoardScreen />)

    expect(await screen.findByRole('alert')).toHaveTextContent('サーバーに接続できません')

    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: '再読み込み' }))

    expect(await screen.findByText('経費の精算を出す')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('サーバーがエラーを返したときは、サーバーの日本語のメッセージを出す', async () => {
    server.use(
      http.get('*/api/boards/:boardId/tasks', () =>
        fail(404, 'BOARD_NOT_FOUND', 'ボードが見つかりません'),
      ),
    )
    renderWithClient(<BoardScreen />)

    expect(await screen.findByRole('alert')).toHaveTextContent('ボードが見つかりません')
  })

  it('ブラウザのタブに戻ってきたら、最新のデータを読み直す（F-51）', async () => {
    renderWithClient(<BoardScreen />)
    await screen.findByText('経費の精算を出す')

    act(() => focusManager.setFocused(false))
    server.use(
      http.get('*/api/boards/:boardId/tasks', () =>
        ok([...tasksByBoard[1], makeTask({ id: 99, title: 'データベースに足したタスク' })]),
      ),
    )
    act(() => focusManager.setFocused(true))

    expect(await screen.findByText('データベースに足したタスク')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '未着手 (3)' })).toBeInTheDocument()
  })
})
