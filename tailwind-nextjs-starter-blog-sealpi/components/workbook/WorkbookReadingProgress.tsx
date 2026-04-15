'use client'

import { useEffect, useState } from 'react'

export default function WorkbookReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      if (scrollHeight <= 0) {
        setProgress(100)
        return
      }
      setProgress(Math.min(100, (window.scrollY / scrollHeight) * 100))
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div className="bg-wb-rule-soft/40 fixed top-0 right-0 left-0 z-50 h-[2px]" aria-hidden="true">
      <div
        className="bg-wb-accent h-full transition-[width] duration-75 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
