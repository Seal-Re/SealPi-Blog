// Pure helpers usable from both server and client modules.
// Kept free of "use client" so Server Components can import without crossing
// the React Server / Client boundary.

export function hasRenderableElements(contentJson?: string): boolean {
  if (!contentJson?.trim()) return false
  try {
    const scene = JSON.parse(contentJson) as { elements?: Array<{ isDeleted?: boolean }> }
    return Boolean(scene.elements?.some((el) => !el.isDeleted))
  } catch {
    return false
  }
}
