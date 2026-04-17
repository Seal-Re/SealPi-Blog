'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminEasterEgg({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [count, setCount] = useState(0)

  return (
    <button
      type="button"
      className="cursor-default"
      onClick={() => {
        const next = count + 1
        if (next >= 5) {
          setCount(0)
          router.push('/login?next=/admin')
          return
        }
        setCount(next)
      }}
    >
      {children}
    </button>
  )
}
