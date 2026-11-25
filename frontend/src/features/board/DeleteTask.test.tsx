import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import type { Task } from '../../api/schemas'
import { tasksByBoard } from '../../test/fixtures'
import { fail, ok } from '../../test/handlers'
import { renderWithClient } from '../../test/renderWithClient'
import { server } from '../../test/server'
import { BoardScreen } from './BoardScreen'

function editDialog(): HTMLElement {
  return screen.getByRole('dialog', { name: 'タスクを編集' })
}

function confirmDialog(): HTMLElement {
  return screen.getByRole('dialog', { name: 'このタスクを削除しますか？' })
}

async function openBoard(): Promise<UserEvent> {
  const user = userEvent.setup()
  renderWithClient(<BoardScreen />)
  await screen.findByText('経費の精算を出す')
  return user
}

/** 「会議の資料をまとめる」（作業中・3番）の編集の小窓を開き、「削除」を押す */
async function openConfirm(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole('button', { name: /会議の資料をまとめる/ }))
  await user.click(within(editDialog()).getByRole('button', { name: '削除' }))
}

/** 削除の DELETE を受け付ける。送られた番号を記録し、次のタスク一覧の読み込みから消す */
function acceptDelete(): number[] {
  const deleted: number[] = []
  let tasks: Task[] = [...tasksByBoard[1]]
  server.use(
    http.get('*/api/boards/1/tasks', () => ok(tasks)),
    http.delete('*/api/tasks/:taskId', ({ params }) => {
      const id = Number(params.taskId)
      deleted.push(id)
      tasks = tasks.filter((task) => task.id !== id)
      return ok(null)
    }),
  )
  return deleted
}

describe('タスクの削除（F-12・S-04）', () => {
  it('編集の小窓には「削除」があり、作成の小窓にはない', async () => {
    const user = await openBoard()

    await user.click(screen.getByRole('button', { name: 'タスクを追加（未着手）' }))
    expect(
      within(screen.getByRole('dialog', { name: 'タスクを作成' })).queryByRole('button', {
        name: '削除',
      }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))

    await user.click(screen.getByRole('button', { name: /会議の資料をまとめる/ }))
    expect(within(editDialog()).getByRole('button', { name: '削除' })).toBeInTheDocument()
  })

  it('「削除」を押すと、タスク名と「元に戻せません」を出した確認の小窓が開き、カーソルは「キャンセル」にある（R-13）', async () => {
    const user = await openBoard()

    await openConfirm(user)

    expect(confirmDialog()).toHaveTextContent('「会議の資料をまとめる」')
    expect(confirmDialog()).toHaveTextContent('削除すると元に戻せません。')
    expect(within(confirmDialog()).getByRole('button', { name: 'キャンセル' })).toHaveFocus()
  })

  it('確認の小窓で「キャンセル」を押すと、確認の小窓だけ閉じて編集の小窓に戻り、何も消えない（AC-06）', async () => {
    // DELETE を用意していないので、送ってしまうとテストが失敗する
    const user = await openBoard()
    await openConfirm(user)

    await user.click(within(confirmDialog()).getByRole('button', { name: 'キャンセル' }))

    expect(
      screen.queryByRole('dialog', { name: 'このタスクを削除しますか？' }),
    ).not.toBeInTheDocument()
    expect(editDialog()).toBeInTheDocument()
    expect(screen.getByText('会議の資料をまとめる')).toBeInTheDocument()
  })

  it('「削除する」を押すと削除を送り、両方の小窓を閉じてカードを消し、カーソルをそのカラムの「タスクを追加」に置く', async () => {
    const deleted = acceptDelete()
    const user = await openBoard()
    await openConfirm(user)

    await user.click(within(confirmDialog()).getByRole('button', { name: '削除する' }))

    await waitFor(() => {
      expect(screen.queryByText('会議の資料をまとめる')).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleted).toEqual([3])
    expect(screen.getByRole('heading', { name: '作業中 (0)' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'タスクを追加（作業中）' })).toHaveFocus()
    })
  })

  it('送っている間は「削除中…」になり、押せない', async () => {
    let respond: () => void = () => {}
    server.use(
      http.delete('*/api/tasks/3', async () => {
        await new Promise<void>((resolve) => {
          respond = resolve
        })
        return HttpResponse.error()
      }),
    )
    const user = await openBoard()
    await openConfirm(user)

    await user.click(within(confirmDialog()).getByRole('button', { name: '削除する' }))

    expect(await within(confirmDialog()).findByRole('button', { name: '削除中…' })).toBeDisabled()
    expect(within(confirmDialog()).getByRole('button', { name: 'キャンセル' })).toBeDisabled()
    respond()
    expect(await within(confirmDialog()).findByRole('alert')).toBeInTheDocument()
  })

  it('ほかの人がすでに削除していたら、「削除できた」として両方の小窓を閉じ、ボードを読み直す（UC-03）', async () => {
    let tasks: Task[] = [...tasksByBoard[1]]
    server.use(
      http.get('*/api/boards/1/tasks', () => ok(tasks)),
      http.delete('*/api/tasks/3', () => {
        tasks = tasks.filter((task) => task.id !== 3)
        return fail(404, 'TASK_NOT_FOUND', 'タスクが見つかりません')
      }),
    )
    const user = await openBoard()
    await openConfirm(user)

    await user.click(within(confirmDialog()).getByRole('button', { name: '削除する' }))

    await waitFor(() => {
      expect(screen.queryByText('会議の資料をまとめる')).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('削除に失敗したら、確認の小窓の中にエラーを出し、カードは残る', async () => {
    server.use(http.delete('*/api/tasks/3', () => HttpResponse.error()))
    const user = await openBoard()
    await openConfirm(user)

    await user.click(within(confirmDialog()).getByRole('button', { name: '削除する' }))

    expect(await within(confirmDialog()).findByRole('alert')).toHaveTextContent(
      'サーバーに接続できません',
    )
    expect(editDialog()).toBeInTheDocument()
    expect(within(confirmDialog()).getByRole('button', { name: '削除する' })).toBeEnabled()
    // 押したボタンが一時的に押せなくなって見失ったカーソルを、「キャンセル」に戻す
    expect(within(confirmDialog()).getByRole('button', { name: 'キャンセル' })).toHaveFocus()
  })

  it('「削除する」を素早く2回押しても、削除は1回しか送らない', async () => {
    const deleted = acceptDelete()
    const user = await openBoard()
    await openConfirm(user)
    const button = within(confirmDialog()).getByRole('button', { name: '削除する' })

    await user.dblClick(button)

    await waitFor(() => {
      expect(screen.queryByText('会議の資料をまとめる')).not.toBeInTheDocument()
    })
    expect(deleted).toEqual([3])
  })
})
