import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeTask } from '../../test/fixtures'
import { TaskCard } from './TaskCard'

function renderCard(task: Parameters<typeof TaskCard>[0]['task']) {
  render(
    <ul>
      <TaskCard task={task} currentYear={2026} />
    </ul>,
  )
  return screen.getByRole('listitem')
}

describe('TaskCard（カードの表示、R-08〜R-11）', () => {
  it('ラベル・タイトル・優先度・期限・説明ありマークを出す', () => {
    const card = renderCard(
      makeTask({
        id: 1,
        title: '経費の精算を出す',
        description: '領収書を添付する',
        priority: 'high',
        dueDate: '2026-11-07',
        labels: [{ id: 1, name: '緊急', color: 'red' }],
      }),
    )

    expect(within(card).getByText('緊急')).toBeInTheDocument()
    expect(within(card).getByText('経費の精算を出す')).toBeInTheDocument()
    expect(within(card).getByText('優先:高')).toBeInTheDocument()
    expect(within(card).getByText('〆11/7')).toHaveAttribute('title', '期限 2026-11-07')
    expect(within(card).getByRole('img', { name: '説明あり' })).toBeInTheDocument()
  })

  it('設定していないものは出さない', () => {
    const card = renderCard(makeTask({ id: 2, title: '部屋の掃除をする' }))

    expect(within(card).queryByText(/優先:/)).not.toBeInTheDocument()
    expect(within(card).queryByText(/〆/)).not.toBeInTheDocument()
    expect(within(card).queryByRole('img', { name: '説明あり' })).not.toBeInTheDocument()
  })

  it('完了したタスクは ✓ を出し、タイトルに取り消し線を引く（F-31）', () => {
    const card = renderCard(makeTask({ id: 3, title: '請求書を送る', completed: true }))

    expect(within(card).getByRole('img', { name: '完了' })).toHaveTextContent('✓')
    expect(within(card).getByText('請求書を送る')).toHaveClass('line-through')
  })

  it('完了していないタスクは「未完了」と読み上げる', () => {
    const card = renderCard(makeTask({ id: 4, title: '企画書を書く' }))

    expect(within(card).getByRole('img', { name: '未完了' })).toBeInTheDocument()
  })

  it('名前のないラベルは色だけの帯にし、色の名前で読み上げる（R-09）', () => {
    const card = renderCard(
      makeTask({ id: 5, title: '資料を印刷', labels: [{ id: 9, name: '', color: 'green' }] }),
    )

    expect(within(card).getByRole('img', { name: '緑（名前なし）' })).toBeInTheDocument()
  })
})
