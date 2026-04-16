'use client'

import { useEffect } from 'react'

const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`

const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

/** Maps hljs language class suffix → human-readable display name. Empty string = no label. */
const LANG_DISPLAY: Record<string, string> = {
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  jsx: 'JSX',
  tsx: 'TSX',
  java: 'Java',
  python: 'Python',
  py: 'Python',
  rust: 'Rust',
  go: 'Go',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  zsh: 'Shell',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  sql: 'SQL',
  markdown: 'Markdown',
  md: 'Markdown',
  toml: 'TOML',
  dockerfile: 'Dockerfile',
  makefile: 'Makefile',
  diff: 'Diff',
  kotlin: 'Kotlin',
  swift: 'Swift',
  ruby: 'Ruby',
  rb: 'Ruby',
  php: 'PHP',
  csharp: 'C#',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  plaintext: '',
  text: '',
  plain: '',
}

/** Attaches copy-to-clipboard buttons and language labels to every .wb-body pre block on mount. */
export default function CopyCodeInit() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLPreElement>('.wb-body pre')

    blocks.forEach((pre) => {
      // Language label — inject independently of copy button
      if (!pre.querySelector('.wb-lang-label')) {
        const codeEl = pre.querySelector('code')
        const langClass = codeEl
          ? Array.from(codeEl.classList).find((c) => c.startsWith('language-'))
          : undefined
        const rawLang = langClass?.slice('language-'.length) ?? ''
        const displayLang = Object.prototype.hasOwnProperty.call(LANG_DISPLAY, rawLang)
          ? LANG_DISPLAY[rawLang]
          : rawLang

        if (displayLang) {
          const label = document.createElement('span')
          label.className = 'wb-lang-label'
          label.textContent = displayLang
          pre.appendChild(label)
        }
      }

      // Copy button
      if (pre.querySelector('.wb-copy-btn')) return

      const btn = document.createElement('button')
      btn.className = 'wb-copy-btn'
      btn.setAttribute('aria-label', '复制代码')
      btn.tabIndex = 0
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
