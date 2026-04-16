import ExcalidrawViewer from '@/components/ExcalidrawViewer'

type ExcalidrawHeroProps = {
  contentJson?: string
  coverImageUrl?: string
  coverCaption?: string
  title: string
}

function hasRenderableElements(contentJson?: string): boolean {
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

  return (
    <div className="relative mb-10">
      <div
        className="border-wb-rule bg-wb-canvas relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[10px] border sm:aspect-video"
        style={{ boxShadow: '3px 4px 0 var(--color-wb-card-shadow)' }}
      >
        {showViewer ? (
          <ExcalidrawViewer contentJson={contentJson} title={title} compact />
        ) : coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="from-wb-rule-soft/30 via-wb-canvas to-wb-rule-soft/20 absolute inset-0 bg-gradient-to-br">
            <span className="text-wb-rule absolute right-4 bottom-4 font-mono text-[10px] tracking-[0.2em] uppercase opacity-50">
              无封面
            </span>
          </div>
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
