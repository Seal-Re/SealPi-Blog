import type { ReactNode } from 'react'

type MarginNoteProps = {
  children: ReactNode
}

export default function MarginNote({ children }: MarginNoteProps) {
  return (
    <aside role="note" aria-label="旁注" className="border-wb-rule relative my-8 ml-3 border-l-2 border-dashed py-1 pr-0 pl-5">
      <span
        className="font-caveat text-wb-accent inline-block text-[22px] leading-snug"
        style={{ transform: 'rotate(-0.5deg)' }}
      >
        <span className="opacity-70">← </span>
        {children}
      </span>
    </aside>
  )
}
