import { describe, expect, it } from 'vitest'
import { makeTask } from '../test/fixtures'
import { canSubmitTaskForm, initialTaskForm, toCreateTaskInput, toTaskFormValues } from './taskForm'

describe('initialTaskForm（作成の小窓の初期値）', () => {
  it('押したカラムだけが入り、ほかは空（優先度・期限・ラベルは「なし」）（R-02）', () => {
    expect(initialTaskForm('doing')).toEqual({
      title: '',
      description: '',
      status: 'doing',
      priority: '',
      dueDate: '',
      labelIds: [],
    })
  })
})

describe('canSubmitTaskForm（「作成」を押せるか）', () => {
  it('タイトルが空、または空白だけなら押せない（R-03・R-05）', () => {
    expect(canSubmitTaskForm({ ...initialTaskForm('todo'), title: '' })).toBe(false)
    expect(canSubmitTaskForm({ ...initialTaskForm('todo'), title: ' 　\n' })).toBe(false)
  })

  it('タイトルに1文字でもあれば押せる', () => {
    expect(canSubmitTaskForm({ ...initialTaskForm('todo'), title: ' a ' })).toBe(true)
  })
})

describe('toCreateTaskInput（サーバーに送る形に直す）', () => {
  it('前後の空白を取り、空の説明・優先度・期限は null にする', () => {
    expect(
      toCreateTaskInput({
        title: '　資料を印刷する ',
        description: '  ',
        status: 'todo',
        priority: '',
        dueDate: '',
        labelIds: [],
      }),
    ).toEqual({
      title: '資料を印刷する',
      description: null,
      status: 'todo',
      priority: null,
      dueDate: null,
      labelIds: [],
    })
  })

  it('入力した値は、そのまま送る（説明の前後の空白だけ取る）', () => {
    expect(
      toCreateTaskInput({
        title: '資料を印刷する',
        description: ' 会議の前に\n10部 ',
        status: 'doing',
        priority: 'high',
        dueDate: '2026-11-25',
        labelIds: [3, 4],
      }),
    ).toEqual({
      title: '資料を印刷する',
      description: '会議の前に\n10部',
      status: 'doing',
      priority: 'high',
      dueDate: '2026-11-25',
      labelIds: [3, 4],
    })
  })

  it('元の入力は書き換えない', () => {
    const values = { ...initialTaskForm('todo'), title: ' a ', labelIds: [1] }

    const input = toCreateTaskInput(values)

    expect(values.title).toBe(' a ')
    expect(input.labelIds).not.toBe(values.labelIds)
  })
})

describe('toTaskFormValues（編集の小窓に今の値を入れる）', () => {
  it('タスクの今の値を、入力欄の形に直す（ラベルは番号だけ）', () => {
    const task = makeTask({
      id: 3,
      title: '会議の資料をまとめる',
      description: '議題を1枚にまとめる',
      status: 'doing',
      priority: 'high',
      dueDate: '2026-11-11',
      labels: [
        { id: 3, name: '会議', color: 'blue' },
        { id: 4, name: '資料', color: 'green' },
      ],
    })

    expect(toTaskFormValues(task)).toEqual({
      title: '会議の資料をまとめる',
      description: '議題を1枚にまとめる',
      status: 'doing',
      priority: 'high',
      dueDate: '2026-11-11',
      labelIds: [3, 4],
    })
  })

  it('「なし」の値（null）は、空の文字にする', () => {
    expect(toTaskFormValues(makeTask({ id: 1, title: 'a' }))).toEqual({
      title: 'a',
      description: '',
      status: 'todo',
      priority: '',
      dueDate: '',
      labelIds: [],
    })
  })
})
