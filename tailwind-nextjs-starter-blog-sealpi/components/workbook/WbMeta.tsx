type WbMetaProps = {
  date: string
  readMinutes?: number
  tags?: string[]
}

export default function WbMeta({ date, readMinutes, tags = [] }: WbMetaProps) {
  return (
    <div className="mb-7 flex flex-wrap items-center gap-3.5 font-inter text-[13px] text-wb-meta">
      <span>{date}</span>
      {readMinutes != null ? (
        <>
          <span className="opacity-40">·</span>
          <span>{readMinutes} min read</span>
        </>
      ) : null}
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded border border-wb-rule px-2.5 py-0.5 font-geist-mono text-[11.5px] text-[#8a6a48]"
        >
          #{tag}
        </span>
      ))}
    </div>
  )
}
