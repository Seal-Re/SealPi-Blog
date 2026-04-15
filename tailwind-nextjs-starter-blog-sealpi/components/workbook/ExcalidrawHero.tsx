import ExcalidrawViewer from '@/components/ExcalidrawViewer'

type ExcalidrawHeroProps = {
  contentJson?: string
  coverImageUrl?: string
  coverCaption?: string
  title: string
}

export default function ExcalidrawHero({
  contentJson,
  coverImageUrl,
  coverCaption,
  title,
}: ExcalidrawHeroProps) {
  return (
    <div className="relative mb-10">
      <div
        className="relative flex aspect-video items-center justify-center overflow-hidden rounded-[10px] border border-wb-rule bg-wb-canvas"
        style={{ boxShadow: '3px 4px 0 var(--color-wb-card-shadow)' }}
      >
        {contentJson ? (
          <ExcalidrawViewer contentJson={contentJson} title={title} />
        ) : coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt={title} className="h-[88%] w-[88%] object-contain" />
        ) : null}
      </div>
      {coverCaption ? (
        <span
          className="absolute -bottom-6 left-3 font-caveat text-[16px] text-wb-accent"
          style={{ transform: 'rotate(-1deg)' }}
        >
          {coverCaption}
        </span>
      ) : null}
    </div>
  )
}
