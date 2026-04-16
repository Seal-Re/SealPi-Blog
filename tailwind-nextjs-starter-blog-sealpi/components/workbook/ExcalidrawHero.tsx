import ExcalidrawViewer from '@/components/ExcalidrawViewer'

type ExcalidrawHeroProps = {
  contentJson?: string
  coverImageUrl?: string
  coverCaption?: string
  title: string
}

export function hasRenderableElements(contentJson?: string): boolean {
  if (!contentJson?.trim()) return false
  try {
    const scene = JSON.parse(contentJson) as { elements?: Array<{ isDeleted?: boolean }> }
    return Boolean(scene.elements?.some((el) => !el.isDeleted))
  } catch {
    return false
  }
}

export default function ExcalidrawHero({
  contentJson,
  coverImageUrl,
  coverCaption,
  title,
}: ExcalidrawHeroProps) {
  const showViewer = hasRenderableElements(contentJson)

  // Nothing to render — skip the hero entirely so the title becomes the visual anchor.
  if (!showViewer && !coverImageUrl) return null

  return (
    <div data-reveal className="relative mb-10">
      <div
        className="border-wb-rule bg-wb-canvas relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[10px] border sm:aspect-video"
        style={{ boxShadow: '3px 4px 0 var(--color-wb-card-shadow)' }}
      >
        {showViewer ? (
          <ExcalidrawViewer contentJson={contentJson} title={title} compact />
        ) : (
          // coverImageUrl is guaranteed truthy here — null guard at top ensures this
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl!}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      {coverCaption ? (
        <span
          className="font-caveat text-wb-accent absolute -bottom-6 left-3 text-[16px]"
          style={{ transform: 'rotate(-1deg)' }}
        >
          {coverCaption}
        </span>
      ) : null}
    </div>
  )
}
