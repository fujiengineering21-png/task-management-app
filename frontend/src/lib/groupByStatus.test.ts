import { describe, expect, it } from 'vitest'
import { makeTask } from '../test/fixtures'
import { groupByStatus } from './groupByStatus'

describe('groupByStatus（3つのカラムに分ける）', () => {
  it('status ごとに分け、届いた順番を変えない', () => {
    const tasks = [
      makeTask({ id: 1, title: 'A', status: 'todo' }),
      makeTask({ id: 2, title: 'B', status: 'doing' }),
      makeTask({ id: 3, title: 'C', status: 'todo' }),
      makeTask({ id: 4, title: 'D', status: 'done' }),
    ]

    const grouped = groupByStatus(tasks)

    expect(grouped.todo.map((t) => t.id)).toEqual([1, 3])
    expect(grouped.doing.map((t) => t.id)).toEqual([2])
    expect(grouped.done.map((t) => t.id)).toEqual([4])
  })

  it('タスクがないカラムは空の一覧にする', () => {
    const grouped = groupByStatus([])

    expect(grouped).toEqual({ todo: [], doing: [], done: [] })
  })
})
