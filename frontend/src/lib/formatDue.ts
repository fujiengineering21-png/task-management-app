/**
 * 期限の表示（R-11）。今年なら「9/30」、今年以外なら「2027/1/15」。
 * 「2026-09-30」の文字列を分けて読む。new Date("2026-09-30") は時差で1日ずれることがあるので使わない（技術スタック 7章）。
 */
export function formatDue(dueDate: string, currentYear: number): string {
  const [year, month, day] = dueDate.split('-').map(Number)
  return year === currentYear ? `${month}/${day}` : `${year}/${month}/${day}`
}
