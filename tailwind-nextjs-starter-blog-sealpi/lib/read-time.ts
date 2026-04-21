/**
 * Estimates reading time for markdown text with mixed CJK/Latin content.
 *
 * CJK reading speed: ~300 characters/minute
 * Latin reading speed: ~220 words/minute
 *
 * Returns `undefined` when the input is blank (no meaningful content).
 */
export function estimateReadMinutes(markdown?: string | null): number | undefined {
  if (!markdown?.trim()) return undefined
  const cjk = (markdown.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length
  const latin = markdown.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ').trim()
  const latinWords = latin ? latin.split(/\s+/).filter(Boolean).length : 0
  return Math.max(1, Math.round(cjk / 300 + latinWords / 220))
}
