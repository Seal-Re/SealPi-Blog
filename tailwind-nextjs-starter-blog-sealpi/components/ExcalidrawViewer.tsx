'use client'

import '@excalidraw/excalidraw/index.css'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import { useTheme } from 'next-themes'
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

const Excalidraw = dynamic(async () => (await import('@excalidraw/excalidraw')).Excalidraw, {
  ssr: false,
  loading: () => (
    <div className="border-wb-rule bg-wb-canvas/80 text-wb-meta flex h-[68vh] min-h-[560px] items-center justify-center rounded-[2rem] border border-dashed text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      正在加载画板阅读器...
    </div>
  ),
})

type ExcalidrawScene = {
  elements?: readonly ExcalidrawElement[]
  appState?: Partial<AppState>
  files?: BinaryFiles
}

type ExcalidrawViewerProps = {
  contentJson?: string | null
  title: string
  /** Hides the header bar; use when the viewer is embedded as a hero image. */
  compact?: boolean
}

function parseScene(contentJson?: string | null): ExcalidrawScene | null {
  if (!contentJson?.trim()) {
    return null
  }

  try {
    return JSON.parse(contentJson) as ExcalidrawScene
  } catch {
    return null
  }
}

export default function ExcalidrawViewer({ contentJson, title, compact }: ExcalidrawViewerProps) {
  const scene = useMemo(() => parseScene(contentJson), [contentJson])
  const hasRenderableElements = Boolean(scene?.elements?.some((element) => !element.isDeleted))
  const { resolvedTheme } = useTheme()
  const excalidrawTheme = resolvedTheme === 'dark' ? 'dark' : 'light'

  if (!scene || !hasRenderableElements) {
    if (compact) return null
    return (
      <section className="border-wb-rule-soft bg-wb-canvas/90 overflow-hidden rounded-[2rem] border shadow-[0_24px_80px_-42px_rgba(31,26,21,0.30)] backdrop-blur dark:shadow-[0_24px_80px_-42px_rgba(0,0,0,0.55)]">
        <div className="border-wb-rule-soft/60 border-b bg-[linear-gradient(135deg,rgba(166,88,43,0.06),rgba(251,245,236,0.95))] px-6 py-5 dark:bg-[linear-gradient(135deg,rgba(166,88,43,0.12),rgba(26,19,13,0.95))]">
          <p className="text-wb-accent dark:text-wb-rule text-xs font-semibold tracking-[0.24em] uppercase">
            Excalidraw 画板
          </p>
          <h2 className="text-wb-ink mt-2 text-xl font-semibold">{title}</h2>
          <p className="text-wb-meta mt-2 text-sm leading-6">当前文章尚未生成可渲染的画板内容。</p>
        </div>
      </section>
    )
  }

  const initialData = {
    elements: scene.elements,
    appState: {
      viewBackgroundColor: excalidrawTheme === 'dark' ? '#21180f' : '#fbf5ec',
      ...scene.appState,
    },
    files: scene.files,
  }

  return (
    <section
      className={`bg-wb-canvas/90 overflow-hidden backdrop-blur ${compact ? 'h-full w-full rounded-none border-0 shadow-none' : 'border-wb-rule-soft rounded-[2rem] border shadow-[0_24px_80px_-42px_rgba(31,26,21,0.30)] dark:shadow-[0_24px_80px_-42px_rgba(0,0,0,0.55)]'}`}
    >
      {!compact && (
        <div className="border-wb-rule-soft/60 flex flex-wrap items-start justify-between gap-4 border-b bg-[linear-gradient(135deg,rgba(166,88,43,0.06),rgba(251,245,236,0.95))] px-6 py-5 dark:bg-[linear-gradient(135deg,rgba(166,88,43,0.12),rgba(26,19,13,0.95))]">
          <div>
            <p className="text-wb-accent dark:text-wb-rule text-xs font-semibold tracking-[0.24em] uppercase">
              Excalidraw 画板
            </p>
            <h2 className="text-wb-ink mt-2 text-xl font-semibold">{title}</h2>
            <p className="text-wb-meta mt-2 text-sm leading-6">
              只读渲染已启用，保留原始画板视觉并支持本地导出查看。
            </p>
          </div>
          <div className="border-wb-rule bg-wb-canvas/85 text-wb-accent inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            只读模式
          </div>
        </div>
      )}
      <div
        className={`bg-[linear-gradient(180deg,rgba(251,245,236,0.95),rgba(245,236,225,0.98))] dark:bg-[linear-gradient(180deg,rgba(26,19,13,0.90),rgba(33,24,15,0.95))] ${compact ? 'h-full' : 'h-[72vh] min-h-[620px]'}`}
      >
        <Excalidraw
          initialData={initialData}
          viewModeEnabled={true}
          theme={excalidrawTheme}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: false,
              export: { saveFileToDisk: true },
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: false,
            },
          }}
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => {
            api.refresh()
          }}
        />
      </div>
    </section>
  )
}
