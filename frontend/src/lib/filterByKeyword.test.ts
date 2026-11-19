import { describe, expect, it } from 'vitest'
import { makeTask } from '../test/fixtures'
import { filterByKeyword, hasKeyword } from './filterByKeyword'

const tasks = [
  makeTask({ id: 1, title: '経費の精算を出す' }),
  makeTask({ id: 2, title: '会議の資料をまとめる', description: '議題と前回の決定事項' }),
  makeTask({ id: 3, title: 'React入門を読む', description: 'TanStack Query の章まで' }),
]

function ids(keyword: string): number[] {
  return filterByKeyword(tasks, keyword).map((task) => task.id)
}

describe('filterByKeyword（キーワード検索 F-60）', () => {
  it('キーワードが空、または空白だけのときは、全部をそのまま返す', () => {
    expect(ids('')).toEqual([1, 2, 3])
    expect(ids('  　')).toEqual([1, 2, 3])
  })

  it('タイトルに含まれる文字で絞り込む', () => {
    expect(ids('精算')).toEqual([1])
  })

  it('説明に含まれる文字でも絞り込む（説明がないタスクは、タイトルだけで調べる）', () => {
    expect(ids('決定事項')).toEqual([2])
  })

  it('大文字と小文字、全角と半角の違いは無視する', () => {
    expect(ids('react')).toEqual([3])
    expect(ids('ＲＥＡＣＴ')).toEqual([3])
    expect(ids('tanstack query')).toEqual([3])
  })

  it('空白で区切った言葉は、すべてを含むタスクだけにする（全角の空白でも区切る）', () => {
    expect(ids('会議 決定事項')).toEqual([2])
    expect(ids('会議　精算')).toEqual([])
  })

  it('前後の空白は無視する', () => {
    expect(ids('  精算  ')).toEqual([1])
  })

  it('一致するタスクがなければ空の一覧を返し、元の一覧は変えない', () => {
    const before = [...tasks]

    expect(filterByKeyword(tasks, '見つからない言葉')).toEqual([])
    expect(tasks).toEqual(before)
  })
})

describe('hasKeyword（絞り込み中かどうか）', () => {
  it('言葉が1つでもあれば true、空や空白だけなら false', () => {
    expect(hasKeyword('会議')).toBe(true)
    expect(hasKeyword(' 　会議 ')).toBe(true)
    expect(hasKeyword('')).toBe(false)
    expect(hasKeyword(' 　 ')).toBe(false)
  })
})
