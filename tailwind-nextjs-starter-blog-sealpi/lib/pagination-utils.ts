/**
 * Returns a compact page-number sequence with at most one ellipsis per gap.
 *
 * Examples:
 *   getPageSequence(1, 5)  → [1, 2, 3, 4, 5]
 *   getPageSequence(1, 10) → [1, 2, 3, 'ellipsis', 10]
 *   getPageSequence(5, 10) → [1, 'ellipsis', 3, 4, 5, 6, 7, 'ellipsis', 10]
 *   getPageSequence(9, 10) → [1, 'ellipsis', 7, 8, 9, 10]
 */
export function getPageSequence(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const items: (number | 'ellipsis')[] = [1]
  const rangeStart = Math.max(2, current - 2)
  const rangeEnd = Math.min(total - 1, current + 2)
  if (rangeStart > 2) items.push('ellipsis')
  for (let p = rangeStart; p <= rangeEnd; p++) items.push(p)
  if (rangeEnd < total - 1) items.push('ellipsis')
  items.push(total)
  return items
}
