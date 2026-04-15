'use client'

import { useEffect } from 'react'

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`

const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

/** Attaches copy-to-clipboard buttons to every .wb-body pre block on mount. */
export default function CopyCodeInit() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLPreElement>('.wb-body pre')

    blocks.forEach((pre) => {
      if (pre.querySelector('.wb-copy-btn')) return

      const btn = document.createElement('button')
      btn.className = 'wb-copy-btn'
      btn.setAttribute('aria-label', '复制代码')
      btn.innerHTML = COPY_ICON

      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code')
        const text = code?.textContent ?? ''
        try {
          await navigator.clipboard.writeText(text)
          btn.innerHTML = CHECK_ICON
          setTimeout(() => {
            btn.innerHTML = COPY_ICON
          }, 2000)
        } catch {
          // clipboard API unavailable — fail silently
        }
      })

      pre.appendChild(btn)
    })
  }, [])

  return null
}
