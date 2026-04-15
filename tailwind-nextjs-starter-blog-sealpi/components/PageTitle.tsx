import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function PageTitle({ children }: Props) {
  return (
    <h1 className="font-fraunces text-wb-ink text-3xl font-medium tracking-tight italic sm:text-4xl md:text-5xl dark:text-gray-100">
      {children}
    </h1>
  )
}
