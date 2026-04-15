type WbMetaProps = {
  date: string
  readMinutes?: number
  tags?: string[]
}

export default function WbMeta({ date, readMinutes, tags = [] }: WbMetaProps) {
  return (
    <div className="font-inter text-wb-meta mb-7 flex flex-wrap items-center gap-3.5 text-[13px]">
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
          className="border-wb-rule font-geist-mono rounded border px-2.5 py-0.5 text-[11.5px] text-[#8a6a48]"
        >
          #{tag}
        </span>
      ))}
    </div>
  )
}
