import { describe, expect, it } from 'vitest'
import { formatDue } from './formatDue'

describe('formatDue（期限の表示、R-11）', () => {
  it('今年の日付は「月/日」で出す', () => {
    expect(formatDue('2026-11-15', 2026)).toBe('11/15')
  })

  it('今年以外の日付は「年/月/日」で出す', () => {
    expect(formatDue('2027-01-15', 2026)).toBe('2027/1/15')
    expect(formatDue('2025-12-31', 2026)).toBe('2025/12/31')
  })

  it('月と日の先頭の0は付けない', () => {
    expect(formatDue('2026-03-05', 2026)).toBe('3/5')
  })
})
