import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import type { CreateTaskInput, Task } from '../../api/schemas'
import { labelsByBoard, tasksByBoard } from '../../test/fixtures'
import { fail, ok } from '../../test/handlers'
import { renderWithClient } from '../../test/renderWithClient'
import { server } from '../../test/server'
import { BoardScreen } from './BoardScreen'

function column(name: string): HTMLElement {
  return screen.getByRole('list', { name: `${name}のタスク` })
}

function dialog(): HTMLElement {
  return screen.getByRole('dialog', { name: 'タスクを編集' })
}

function titleBox(): HTMLElement {
  return within(dialog()).getByRole('textbox', { name: /タイトル/ })
}

/** カード（タイトルを含むボタン）を押す */
async function openCard(user: UserEvent, title: string): Promise<void> {
  await user.click(screen.getByRole('button', { name: new RegExp(title) }))
}

async function openBoard(): Promise<UserEvent> {
  const user = userEvent.setup()
  renderWithClient(<BoardScreen />)
  await screen.findByText('経費の精算を出す')
  return user
}

/**
 * 書き換えの PUT を受け付ける。送られた中身を記録し、次のタスク一覧の読み込みに反映する
 * （カラムが変わったら移動先の一番下に入れる。サーバーと同じ考え方）
 */
function acceptUpdate(): CreateTaskInput[] {
  const bodies: CreateTaskInput[] = []
  let tasks: Task[] = [...tasksByBoard[1]]
  server.use(
    http.get('*/api/boards/1/tasks', () => ok(tasks)),
    http.put('*/api/tasks/:taskId', async ({ request, params }) => {
      const body = (await request.json()) as CreateTaskInput
      bodies.push(body)
      const before = tasks.find((task) => task.id === Number(params.taskId))
      if (!before) {
        return fail(404, 'TASK_NOT_FOUND', 'タスクが見つかりません')
      }
      const moved = before.status !== body.status
      const lastPosition = Math.max(
        -1,
        ...tasks.filter((task) => task.status === body.status).map((task) => task.position),
      )
      const updated: Task = {
        ...before,
        title: body.title,
        description: body.description,
        status: body.status,
        position: moved ? lastPosition + 1 : before.position,
        priority: body.priority,
        dueDate: body.dueDate,
        labels: labelsByBoard[1].filter((label) => body.labelIds.includes(label.id)),
      }
      // 動かしたタスクは一覧の最後に置く（カラムの中は position の順に並ぶため）
      tasks = [...tasks.filter((task) => task.id !== before.id), updated]
      return ok(updated)
    }),
  )
  return bodies
}

describe('タスクの編集（F-11・S-03）', () => {
  it('カードを押すと編集の小窓が開き、今の値が全部入っている（UC-02）', async () => {
    const user = await openBoard()

    await openCard(user, '会議の資料をまとめる')

    expect(titleBox()).toHaveValue('会議の資料をまとめる')
    expect(titleBox()).toHaveFocus()
    expect(within(dialog()).getByRole('textbox', { name: '説明' })).toHaveValue(
      '議題と前回の決定事項を1枚にまとめる',
    )
    expect(within(dialog()).getByRole('combobox', { name: 'カラム' })).toHaveValue('doing')
    expect(within(dialog()).getByRole('combobox', { name: '優先度' })).toHaveValue('')
    expect(await within(dialog()).findByRole('checkbox', { name: '会議' })).toBeChecked()
    expect(within(dialog()).getByRole('checkbox', { name: '緊急' })).not.toBeChecked()
    expect(within(dialog()).getByRole('button', { name: '保存' })).toBeEnabled()
  })

  it('書き換えて「保存」を押すと、全部の項目を送り、小窓を閉じてカードに反映する', async () => {
    const bodies = acceptUpdate()
    const user = await openBoard()
    await openCard(user, '会議の資料をまとめる')
    await within(dialog()).findByRole('checkbox', { name: '会議' })

    await user.clear(titleBox())
    await user.type(titleBox(), '  会議の資料を仕上げる  ')
    await user.selectOptions(within(dialog()).getByRole('combobox', { name: '優先度' }), '高')
    await user.click(within(dialog()).getByRole('checkbox', { name: '緊急' }))
    await user.click(within(dialog()).getByRole('button', { name: '保存' }))

    expect(await within(column('作業中')).findByText('会議の資料を仕上げる')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(bodies).toEqual([
      {
        title: '会議の資料を仕上げる',
        description: '議題と前回の決定事項を1枚にまとめる',
        status: 'doing',
        priority: 'high',
        dueDate: null,
        labelIds: [3, 1],
      },
    ])
  })

  it('カラムを変えて保存すると、移動先の一番下に出て、そのカードにカーソルが当たる（R-04）', async () => {
    acceptUpdate()
    const user = await openBoard()
    await openCard(user, '週次レポートを書く')

    await user.selectOptions(within(dialog()).getByRole('combobox', { name: 'カラム' }), '完了')
    await user.click(within(dialog()).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(within(column('完了')).getAllByRole('listitem').at(-1)).toHaveTextContent(
        '週次レポートを書く',
      )
    })
    expect(screen.getByRole('heading', { name: '未着手 (1)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '完了 (2)' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /週次レポートを書く/ })).toHaveFocus()
    })
  })

  it('「キャンセル」では何も送らず、カードは元のまま。もう一度開くと元の値が入っている（AC-04）', async () => {
    // PUT を用意していないので、送ってしまうとテストが失敗する
    const user = await openBoard()
    await openCard(user, '会議の資料をまとめる')

    await user.clear(titleBox())
    await user.type(titleBox(), '書き換えた')
    await user.click(within(dialog()).getByRole('button', { name: 'キャンセル' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('会議の資料をまとめる')).toBeInTheDocument()
    await openCard(user, '会議の資料をまとめる')
    expect(titleBox()).toHaveValue('会議の資料をまとめる')
  })

  it('タイトルを空にすると「保存」を押せない（R-03）', async () => {
    const user = await openBoard()
    await openCard(user, '会議の資料をまとめる')

    await user.clear(titleBox())

    expect(within(dialog()).getByRole('button', { name: '保存' })).toBeDisabled()
  })

  it('ほかの人が削除していたら「このタスクはすでに削除されています」と出し、ボードを読み直す（R-28）', async () => {
    let tasks: Task[] = [...tasksByBoard[1]]
    server.use(
      http.get('*/api/boards/1/tasks', () => ok(tasks)),
      http.put('*/api/tasks/3', () => {
        tasks = tasks.filter((task) => task.id !== 3)
        return fail(404, 'TASK_NOT_FOUND', 'タスクが見つかりません')
      }),
    )
    const user = await openBoard()
    await openCard(user, '会議の資料をまとめる')

    await user.click(within(dialog()).getByRole('button', { name: '保存' }))

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent(
      'このタスクはすでに削除されています',
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '作業中 (0)' })).toBeInTheDocument()
    })
  })

  it('保存に失敗したら、小窓を開いたままメッセージを出し、入力は残す（R-25）', async () => {
    server.use(http.put('*/api/tasks/3', () => HttpResponse.error()))
    const user = await openBoard()
    await openCard(user, '会議の資料をまとめる')
    await user.type(titleBox(), '（追記）')

    await user.click(within(dialog()).getByRole('button', { name: '保存' }))

    expect(await within(dialog()).findByRole('alert')).toHaveTextContent('サーバーに接続できません')
    expect(titleBox()).toHaveValue('会議の資料をまとめる（追記）')
  })

  it('キーワードで絞り込んでいる間も、カードを押して編集できる（R-20）', async () => {
    const user = await openBoard()
    await user.type(screen.getByRole('searchbox', { name: 'キーワードで検索' }), 'まとめる')

    await openCard(user, '会議の資料をまとめる')

    expect(titleBox()).toHaveValue('会議の資料をまとめる')
  })
})
