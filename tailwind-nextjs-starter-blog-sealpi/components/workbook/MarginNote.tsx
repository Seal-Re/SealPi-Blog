import type { ReactNode } from 'react'

type MarginNoteProps = {
  children: ReactNode
}

export default function MarginNote({ children }: MarginNoteProps) {
  return (
    <aside className="relative my-8 ml-3 border-l-2 border-dashed border-wb-rule py-1 pr-0 pl-5">
      <span
        className="inline-block font-caveat text-[22px] leading-snug text-wb-accent"
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        <span className="opacity-70">← </span>
        {children}
      </span>
    </aside>
  )
}
