import { act, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import type { CreateTaskInput, Task } from '../../api/schemas'
import { makeTask, tasksByBoard } from '../../test/fixtures'
import { fail, ok } from '../../test/handlers'
import { renderWithClient } from '../../test/renderWithClient'
import { server } from '../../test/server'
import { BoardScreen } from './BoardScreen'

function column(name: string): HTMLElement {
  return screen.getByRole('list', { name: `${name}のタスク` })
}

function dialog(): HTMLElement {
  return screen.getByRole('dialog', { name: 'タスクを作成' })
}

function titleBox(): HTMLElement {
  return within(dialog()).getByRole('textbox', { name: /タイトル/ })
}

function submitButton(): HTMLElement {
  return within(dialog()).getByRole('button', { name: '作成' })
}

async function openBoard(): Promise<UserEvent> {
  const user = userEvent.setup()
  renderWithClient(<BoardScreen />)
  await screen.findByText('経費の精算を出す')
  return user
}

/** 作成の POST を受け付ける。送られた中身を記録し、次のタスク一覧の読み込みに新しいタスクを足す */
function acceptCreate(): CreateTaskInput[] {
  const bodies: CreateTaskInput[] = []
  let tasks: Task[] = [...tasksByBoard[1]]
  server.use(
    http.get('*/api/boards/1/tasks', () => ok(tasks)),
    http.post('*/api/boards/1/tasks', async ({ request }) => {
      const body = (await request.json()) as CreateTaskInput
      bodies.push(body)
      const created = makeTask({
        id: 15,
        title: body.title,
        status: body.status,
        position: 9,
        priority: body.priority,
        dueDate: body.dueDate,
      })
      tasks = [...tasks, created]
      return HttpResponse.json(
        { success: true, data: created, error: null, meta: null },
        { status: 201 },
      )
    }),
  )
  return bodies
}

describe('タスクの作成（F-10・S-02）', () => {
  it('各カラムの下に「タスクを追加」があり、押すと小窓が開いて、押したカラムが入り、タイトル欄にカーソルが移る（R-02・N-21）', async () => {
    const user = await openBoard()

    expect(screen.getAllByRole('button', { name: /タスクを追加/ })).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'タスクを追加（作業中）' }))

    expect(dialog()).toBeInTheDocument()
    expect(within(dialog()).getByRole('combobox', { name: 'カラム' })).toHaveValue('doing')
    expect(within(dialog()).getByRole('combobox', { name: '優先度' })).toHaveValue('')
    expect(titleBox()).toHaveFocus()
  })

  it('ラベル欄に、開いているボードのラベルを全部出す（タスクに付いていないラベルも）', async () => {
    const user = await openBoard()
    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))

    const labels = await within(dialog()).findAllByRole('checkbox')

    expect(labels.map((box) => box.closest('label')?.textContent)).toEqual([
      '緊急',
      '請求',
      '会議',
      '学習',
    ])
  })

  it('タイトルが空、または空白だけなら「作成」を押せない（R-03・R-05）', async () => {
    const user = await openBoard()
    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))

    expect(submitButton()).toBeDisabled()
    await user.type(titleBox(), '   ')
    expect(submitButton()).toBeDisabled()
    await user.type(titleBox(), 'a')
    expect(submitButton()).toBeEnabled()
  })

  it('入力して「作成」を押すと、整えた中身を送り、小窓を閉じて、選んだカラムの一番下にカードを出す', async () => {
    const bodies = acceptCreate()
    const user = await openBoard()
    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))

    await user.type(titleBox(), '  資料を印刷する  ')
    await user.selectOptions(within(dialog()).getByRole('combobox', { name: 'カラム' }), '作業中')
    await user.selectOptions(within(dialog()).getByRole('combobox', { name: '優先度' }), '高')
    await user.type(within(dialog()).getByLabelText('期限'), '2026-11-25')
    await user.click(await within(dialog()).findByRole('checkbox', { name: '会議' }))
    await user.click(submitButton())

    expect(await screen.findByText('資料を印刷する')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(bodies).toEqual([
      {
        title: '資料を印刷する',
        description: null,
        status: 'doing',
        priority: 'high',
        dueDate: '2026-11-25',
        labelIds: [3],
      },
    ])
    const doingCards = within(column('作業中')).getAllByRole('listitem')
    expect(doingCards.at(-1)).toHaveTextContent('資料を印刷する')
    expect(screen.getByRole('heading', { name: '作業中 (2)' })).toBeInTheDocument()
  })

  it('送っている間は「作成中…」になり、押せない（二重登録を防ぐ R-24）', async () => {
    let respond: () => void = () => {}
    server.use(
      http.post('*/api/boards/1/tasks', async () => {
        await new Promise<void>((resolve) => {
          respond = resolve
        })
        return fail(409, 'TASK_LIMIT_REACHED', 'これ以上タスクを作成できません')
      }),
    )
    const user = await openBoard()
    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))
    await user.type(titleBox(), '資料を印刷する')

    await user.click(submitButton())

    expect(await within(dialog()).findByRole('button', { name: '作成中…' })).toBeDisabled()
    expect(within(dialog()).getByRole('button', { name: 'キャンセル' })).toBeDisabled()
    respond()
    expect(await within(dialog()).findByRole('alert')).toBeInTheDocument()
  })

  it('送っている間にブラウザが小窓を閉じても（Esc の連打など）、開き直して結果を出す', async () => {
    let respond: () => void = () => {}
    server.use(
      http.post('*/api/boards/1/tasks', async () => {
        await new Promise<void>((resolve) => {
          respond = resolve
        })
        return fail(409, 'TASK_LIMIT_REACHED', 'これ以上タスクを作成できません')
      }),
    )
    const user = await openBoard()
    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))
    await user.type(titleBox(), '資料を印刷する')
    await user.click(submitButton())
    await within(dialog()).findByRole('button', { name: '作成中…' })

    act(() => (dialog() as HTMLDialogElement).close())

    expect(dialog()).toHaveAttribute('open')
    respond()
    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
      'これ以上タスクを作成できません',
    )
  })

  it('保存できたのに返事が読めなかったときも、一覧を読み直して、作られたタスクを出す（押し直して重複させないため）', async () => {
    let tasks: Task[] = [...tasksByBoard[1]]
    server.use(
      http.get('*/api/boards/1/tasks', () => ok(tasks)),
      http.post('*/api/boards/1/tasks', () => {
        tasks = [...tasks, makeTask({ id: 15, title: '資料を印刷する', position: 9 })]
        return ok({ id: 'おかしな形' })
      }),
    )
    const user = await openBoard()
    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))
    await user.type(titleBox(), '資料を印刷する')

    await user.click(submitButton())

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
      'サーバーから届いたデータの形が正しくありません',
    )
    expect(await within(column('未着手')).findByText('資料を印刷する')).toBeInTheDocument()
  })

  it('サーバーが断ったら、小窓を開いたまま日本語のメッセージを出し、入力は残す（R-25・R-29）', async () => {
    server.use(
      http.post('*/api/boards/1/tasks', () =>
        fail(409, 'TASK_LIMIT_REACHED', 'これ以上タスクを作成できません'),
      ),
    )
    const user = await openBoard()
    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))
    await user.type(titleBox(), '資料を印刷する')

    await user.click(submitButton())

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
      'これ以上タスクを作成できません',
    )
    expect(titleBox()).toHaveValue('資料を印刷する')
    expect(submitButton()).toBeEnabled()
    // 押したボタンが一時的に押せなくなって見失ったカーソルを、タイトル欄に戻す
    expect(titleBox()).toHaveFocus()
  })

  it('サーバーにつながらないときも、小窓の中に「サーバーに接続できません」と出す', async () => {
    server.use(http.post('*/api/boards/1/tasks', () => HttpResponse.error()))
    const user = await openBoard()
    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))
    await user.type(titleBox(), '資料を印刷する')

    await user.click(submitButton())

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('サーバーに接続できません')
  })

  it('「キャンセル」や「閉じる」を押すと、何も送らずに小窓を閉じる（R-03）', async () => {
    // POST を用意していないので、送ってしまうとテストが失敗する
    const user = await openBoard()

    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))
    await user.type(titleBox(), '資料を印刷する')
    await user.click(within(dialog()).getByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))
    expect(titleBox()).toHaveValue('')
    await user.click(within(dialog()).getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('資料を印刷する')).not.toBeInTheDocument()
  })

  it('キーワードで絞り込んでいる間は「タスクを追加」を出さない（R-20）', async () => {
    const user = await openBoard()

    await user.type(screen.getByRole('searchbox', { name: 'キーワードで検索' }), 'まとめる')

    expect(screen.queryByRole('button', { name: /タスクを追加/ })).not.toBeInTheDocument()
  })
})
