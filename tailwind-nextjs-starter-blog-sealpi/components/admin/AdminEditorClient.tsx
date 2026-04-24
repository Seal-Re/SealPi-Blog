'use client'

import '@excalidraw/excalidraw/index.css'

import dynamic from 'next/dynamic'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { pinyin } from 'pinyin-pro'

import {
  createAdminArticle,
  type AdminArticleFormPayload,
  updateAdminArticle,
  uploadAdminAsset,
} from '@/lib/admin-api'
import type { AdminArticle } from '@/lib/blog-api-types'
import { isPublishedStatus } from '@/lib/article-status'
import { estimateReadMinutes } from '@/lib/read-time'
import BodyMarkdown from '@/components/workbook/BodyMarkdown'

type SubmitAction = 'draft' | 'publish'
type ExcalidrawModule = typeof import('@excalidraw/excalidraw')
type SyncState = 'SUCCESS' | 'DIRTY' | 'UPDATING' | 'FAILED'
type SlugCheckState = 'idle' | 'checking' | 'available' | 'taken'
type ExcalidrawApiLike = {
  getSceneElements?: () => readonly ExcalidrawElement[]
  getAppState?: () => AppState
  getFiles?: () => BinaryFiles
  updateScene?: (scene: {
    elements?: readonly ExcalidrawElement[]
    appState?: AppState
    files?: BinaryFiles
  }) => void
}

const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw')
    return mod.Excalidraw
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <span className="animate-pulse text-sm text-amber-700/50 dark:text-amber-300/40">
          画板加载中…
        </span>
      </div>
    ),
  }
)

const MAX_INLINE_IMAGE_BYTES = 200 * 1024
const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024
const AUTO_SYNC_IDLE_MS = 1200
const AUTO_SAVE_TO_SERVER_MS = 4000
const DEBUG_PREFIX = '[AdminEditor]'
const PREVIEW_IMAGE_WIDTH = 1200
const PREVIEW_IMAGE_HEIGHT = 630
// Raw Excalidraw export is the minimum rectangle covering content (no padding).
// fitBlobToFixedSize() then contain-letterboxes it into 1200x630, so whitespace
// appears only on the axis that would otherwise overflow. Larger export padding
// would stack redundant whitespace on top of the letterbox gaps.
const PREVIEW_EXPORT_PADDING_PX = 0
const PREVIEW_FALLBACK_BG = '#fbf5ec'

type EditorState = {
  title: string
  url: string
  summary: string
  coverImageUrl: string
  draftBodyMd: string
  coverCaption: string
  tags: string
}

type FieldErrors = {
  title?: string
  content?: string
}

type AdminEditorClientProps = {
  article?: AdminArticle | null
  onSubmitSuccess?: (action: SubmitAction) => void | Promise<void>
  onArticleIdResolved?: (articleId: number) => void
}

export type AdminEditorClientRef = {
  saveDraft: () => Promise<boolean>
  publish: () => Promise<boolean>
  isBusy: () => boolean
  hasPendingChanges: () => boolean
}

function slugify(value: string) {
  const normalized = pinyin(value.replace(/<[^>]*>/g, '').trim(), {
    toneType: 'none',
    nonZh: 'consecutive',
  })

  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function sanitizeText(value: string) {
  return value.replace(/<[^>]*>/g, '').trim()
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64Payload] = dataUrl.split(',', 2)
  if (!header || !base64Payload) {
    throw new Error('图片数据格式无效，无法上传。')
  }

  const mimeMatch = header.match(/^data:(.*?);base64$/)
  const mimeType = mimeMatch?.[1] || 'application/octet-stream'
  const binary = atob(base64Payload)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mimeType })
}

async function fitBlobToFixedSize(
  blob: Blob,
  targetWidth: number,
  targetHeight: number,
  backgroundColor: string
): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('failed to decode preview image'))
      image.src = url
    })
    const scale = Math.min(targetWidth / img.width, targetHeight / img.height)
    const drawWidth = img.width * scale
    const drawHeight = img.height * scale
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 2d context unavailable')
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, targetWidth, targetHeight)
    ctx.drawImage(
      img,
      (targetWidth - drawWidth) / 2,
      (targetHeight - drawHeight) / 2,
      drawWidth,
      drawHeight
    )
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('canvas toBlob returned null'))),
        'image/png'
      )
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function inferImageExtension(mimeType?: string) {
  switch (mimeType) {
    case 'image/png':
      return 'png'
    case 'image/jpeg':
      return 'jpg'
    case 'image/webp':
      return 'webp'
    case 'image/svg+xml':
      return 'svg'
    case 'image/gif':
      return 'gif'
    default:
      return 'bin'
  }
}

function isDataUrl(value?: string | null) {
  return Boolean(value && value.startsWith('data:'))
}

function estimateBase64Bytes(dataUrl: string) {
  const payload = dataUrl.split(',', 2)[1] || ''
  return Math.floor((payload.length * 3) / 4)
}

function buildSceneFingerprint(elements: readonly ExcalidrawElement[], files: BinaryFiles) {
  const elementPart = elements
    .map((item) => `${item.id}:${item.version}:${item.isDeleted ? 1 : 0}`)
    .join('|')
  const filePart = Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, file]) => `${id}:${file?.mimeType || ''}:${(file?.dataURL || '').length}`)
    .join('|')
  return `${elementPart}#${filePart}`
}

function getInitialState(article?: AdminArticle | null): EditorState {
  const tagNames =
    article?.tags
      ?.map((t) => t.name)
      .filter(Boolean)
      .join(', ') ?? ''
  return {
    title: article?.title || '',
    url: article?.url || '',
    summary: article?.summary || '',
    coverImageUrl: article?.coverImageUrl || '',
    draftBodyMd: article?.draftBodyMd ?? '',
    coverCaption: article?.coverCaption ?? '',
    tags: tagNames,
  }
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-wb-meta text-xs leading-6 dark:text-gray-400">{children}</p>
}

function StatusDot({ tone }: { tone: SyncState }) {
  const toneClass = {
    SUCCESS: 'bg-emerald-400',
    DIRTY: 'bg-amber-400',
    UPDATING: 'bg-amber-400 animate-pulse',
    FAILED: 'bg-rose-400',
  }[tone]

  return <span className={`inline-flex h-2.5 w-2.5 rounded-full ${toneClass}`} />
}

function MdToolbarButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="text-wb-meta hover:text-wb-ink hover:bg-wb-paper focus-visible:ring-wb-accent/50 rounded px-1.5 py-0.5 font-mono text-[10px] leading-4 transition-colors focus-visible:ring-1 focus-visible:outline-none active:scale-95 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
    >
      {children}
    </button>
  )
}

const AdminEditorClient = forwardRef<AdminEditorClientRef, AdminEditorClientProps>(
  function AdminEditorClient({ article, onSubmitSuccess, onArticleIdResolved }, ref) {
    const excalidrawModuleRef = useRef<ExcalidrawModule | null>(null)
    const excalidrawApiRef = useRef<ExcalidrawImperativeAPI | null>(null)
    const latestSceneRef = useRef<{
      elements: readonly ExcalidrawElement[]
      appState: AppState
      files: BinaryFiles
    } | null>(null)
    const autoSyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const idleSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const uploadAbortRef = useRef(false)
    const submitInFlightRef = useRef(false)
    const autoSaveLockRef = useRef(false)
    const inlineAssetSanitizingRef = useRef(false)
    const pendingDraftJsonRef = useRef<string>(article?.draftJson || article?.contentJson || '')
    const lastSavedDraftJsonRef = useRef<string>(article?.draftJson || article?.contentJson || '')
    const contentFingerprintRef = useRef<string>('')
    const baselineReadyRef = useRef(false)
    const isSceneDirtyRef = useRef(false)
    const isTextDirtyRef = useRef(false)
    const hasUnsavedCanvasRef = useRef(false)
    const isSubmittingRef = useRef(false)
    const isUploadingAssetsRef = useRef(false)
    const coverUploadInputRef = useRef<HTMLInputElement | null>(null)
    const mdTextareaRef = useRef<HTMLTextAreaElement | null>(null)
    const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [isCoverUploading, setIsCoverUploading] = useState(false)
    const [slugCheck, setSlugCheck] = useState<SlugCheckState>('idle')
    /** 新建文章时默认 false：slug 随标题（含拼音）更新；用户手动改过 slug 后为 true。编辑已有文章初始为 true，避免改标题误伤线上 URL。 */
    const slugDetachedFromTitleRef = useRef(Boolean(article?.articleId))

    const [formState, setFormState] = useState<EditorState>(() => getInitialState(article))
    const [draftJson, setDraftJson] = useState<string>(
      article?.draftJson || article?.contentJson || ''
    )
    const [statusMessage, setStatusMessage] = useState<string>('编辑器已就绪，可开始绘制。')
    const [errorMessage, setErrorMessage] = useState<string>('')
    const [syncState, setSyncState] = useState<SyncState>('SUCCESS')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submittingAction, setSubmittingAction] = useState<SubmitAction | null>(null)
    const [isSceneDirty, setIsSceneDirty] = useState(false)
    const [isTextDirty, setIsTextDirty] = useState(false)
    const [isUploadingAssets, setIsUploadingAssets] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<string>('')
    const [showMdPreview, setShowMdPreview] = useState(false)
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [snackbar, setSnackbar] = useState<{
      show: boolean
      message: string
      tone: 'ok' | 'error'
    }>({
      show: false,
      message: '',
      tone: 'ok',
    })
    const [isPublished, setIsPublished] = useState(() => isPublishedStatus(article?.draft))
    const [existingTags, setExistingTags] = useState<string[]>([])
    useEffect(() => {
      isSceneDirtyRef.current = isSceneDirty
    }, [isSceneDirty])

    useEffect(() => {
      isTextDirtyRef.current = isTextDirty
    }, [isTextDirty])

    useEffect(() => {
      if ((isSceneDirty || isTextDirty) && !isSubmitting && !isUploadingAssets) {
        setSyncState((prev) => (prev === 'UPDATING' ? prev : 'DIRTY'))
      }
    }, [isSceneDirty, isTextDirty, isSubmitting, isUploadingAssets])

    useEffect(() => {
      isSubmittingRef.current = isSubmitting
    }, [isSubmitting])

    useEffect(() => {
      isUploadingAssetsRef.current = isUploadingAssets
    }, [isUploadingAssets])

    useEffect(() => {
      slugDetachedFromTitleRef.current = Boolean(article?.articleId)
    }, [article?.articleId])

    useEffect(() => {
      fetch('/api/tags')
        .then((r) => r.json())
        .then((data: { name?: string }[]) => {
          if (Array.isArray(data)) {
            setExistingTags(data.map((t) => t.name).filter((n): n is string => Boolean(n)))
          }
        })
        .catch(() => {})
    }, [])

    const [currentArticleId, setCurrentArticleId] = useState<number | null>(
      article?.articleId ? Number(article.articleId) : null
    )
    const isEditMode = currentArticleId !== null

    useEffect(() => {
      const slug = formState.url.trim()
      // Skip check when slug is empty, or in edit-mode and slug hasn't changed from the saved value
      if (!slug || (article?.articleId && slug === article.url)) {
        setSlugCheck('idle')
        return
      }
      if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current)
      setSlugCheck('checking')
      slugCheckTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch(
            `/api/admin/articles?${new URLSearchParams({ q: slug, pageSize: '20' }).toString()}`
          )
          if (!res.ok) {
            setSlugCheck('idle')
            return
          }
          const json = await res.json()
          const items: AdminArticle[] = json?.data?.list ?? []
          const conflict = items.find(
            (item) => item.url === slug && String(item.articleId) !== String(currentArticleId)
          )
          setSlugCheck(conflict ? 'taken' : 'available')
        } catch {
          setSlugCheck('idle')
        }
      }, 800)
      return () => {
        if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current)
      }
    }, [formState.url, article?.articleId, article?.url, currentArticleId])

    const initialData = useMemo(() => {
      const raw = article?.draftJson || article?.contentJson
      if (!raw?.trim()) {
        return null
      }

      try {
        return JSON.parse(raw)
      } catch {
        return null
      }
    }, [article?.contentJson, article?.draftJson])

    const statusBadgeClass = {
      SUCCESS:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
      DIRTY:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
      UPDATING:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
      FAILED:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
    }[syncState]

    const syncStateLabel: Record<SyncState, string> = {
      SUCCESS: '已保存',
      DIRTY: '有未保存更改',
      UPDATING: '同步中',
      FAILED: '失败',
    }

    const updateField = useCallback((key: keyof EditorState, value: string) => {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
      setIsTextDirty(true)
      setFormState((current) => {
        if (key === 'title') {
          const nextTitle = value
          const followTitle = !slugDetachedFromTitleRef.current || !current.url.trim()
          const nextUrl = followTitle ? slugify(nextTitle) : current.url
          return {
            ...current,
            title: nextTitle,
            url: nextUrl,
          }
        }

        if (key === 'url') {
          const nextUrl = slugify(value)
          if (!nextUrl.trim()) {
            slugDetachedFromTitleRef.current = false
            return {
              ...current,
              url: slugify(current.title),
            }
          }
          slugDetachedFromTitleRef.current = true
          return {
            ...current,
            url: nextUrl,
          }
        }

        return {
          ...current,
          [key]: value,
        }
      })
    }, [])

    const pushSnackbar = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
      setSnackbar({ show: true, message, tone })
      setTimeout(() => {
        setSnackbar((prev) => ({ ...prev, show: false }))
      }, 2800)
    }, [])

    /** Wrap selection (or insert placeholder) with prefix + suffix. */
    const insertMd = useCallback((prefix: string, suffix = '', placeholder = '') => {
      const el = mdTextareaRef.current
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const inner = el.value.slice(start, end) || placeholder
      const next = el.value.slice(0, start) + prefix + inner + suffix + el.value.slice(end)
      setFormState((prev) => ({ ...prev, draftBodyMd: next }))
      setIsTextDirty(true)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start + prefix.length, start + prefix.length + inner.length)
      })
    }, [])

    /** Prepend prefix to the start of the current line. */
    const insertMdLine = useCallback((prefix: string) => {
      const el = mdTextareaRef.current
      if (!el) return
      const pos = el.selectionStart
      const lineStart = el.value.lastIndexOf('\n', pos - 1) + 1
      const next = el.value.slice(0, lineStart) + prefix + el.value.slice(lineStart)
      setFormState((prev) => ({ ...prev, draftBodyMd: next }))
      setIsTextDirty(true)
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(pos + prefix.length, pos + prefix.length)
      })
    }, [])

    /** Toggle prefix on the current line: remove if already present, prepend otherwise. */
    const toggleMdLinePrefix = useCallback((prefix: string) => {
      const el = mdTextareaRef.current
      if (!el) return
      const pos = el.selectionStart
      const lineStart = el.value.lastIndexOf('\n', pos - 1) + 1
      const currentLine = el.value.slice(lineStart)
      if (currentLine.startsWith(prefix)) {
        // Remove prefix
        const next = el.value.slice(0, lineStart) + el.value.slice(lineStart + prefix.length)
        setFormState((prev) => ({ ...prev, draftBodyMd: next }))
        setIsTextDirty(true)
        requestAnimationFrame(() => {
          el.focus()
          const newPos = Math.max(lineStart, pos - prefix.length)
          el.setSelectionRange(newPos, newPos)
        })
      } else {
        // Prepend prefix
        const next = el.value.slice(0, lineStart) + prefix + el.value.slice(lineStart)
        setFormState((prev) => ({ ...prev, draftBodyMd: next }))
        setIsTextDirty(true)
        requestAnimationFrame(() => {
          el.focus()
          el.setSelectionRange(pos + prefix.length, pos + prefix.length)
        })
      }
    }, [])

    /** Insert a block at the current cursor position (ensures leading newline if needed).
     * @param cursorInBlock - Optional offset within the block to place the cursor.
     *   Defaults to end-of-block (after trailing newline). Pass e.g. 4 to land inside a fence. */
    const insertMdBlock = useCallback((block: string, cursorInBlock?: number) => {
      const el = mdTextareaRef.current
      if (!el) return
      const pos = el.selectionStart
      const before = el.value.slice(0, pos)
      const after = el.value.slice(pos)
      const sep = before && !before.endsWith('\n') ? '\n' : ''
      const next = before + sep + block + '\n' + after
      setFormState((prev) => ({ ...prev, draftBodyMd: next }))
      setIsTextDirty(true)
      requestAnimationFrame(() => {
        el.focus()
        const rawOffset = cursorInBlock !== undefined ? cursorInBlock : block.length + 1
        const newPos = before.length + sep.length + rawOffset
        el.setSelectionRange(newPos, newPos)
      })
    }, [])

    const insertMarkdownImage = useCallback((url: string, alt: string) => {
      const el = mdTextareaRef.current
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const snippet = `![${alt}](${url})`
      const next = el.value.slice(0, start) + snippet + el.value.slice(end)
      setFormState((prev) => ({ ...prev, draftBodyMd: next }))
      setIsTextDirty(true)
      requestAnimationFrame(() => {
        el.focus()
        const caret = start + snippet.length
        el.setSelectionRange(caret, caret)
      })
    }, [])

    const uploadAndInsertMarkdownImage = useCallback(
      async (file: File) => {
        const rawName = file.name || 'image.png'
        const altBase = rawName.replace(/\.[^.]+$/, '') || 'image'
        setStatusMessage(`正在上传 ${rawName}...`)
        try {
          const result = await uploadAdminAsset(file, `md-${Date.now()}-${rawName}`)
          const url = result?.data?.trim()
          if (!url) {
            pushSnackbar('图片上传失败：未获取到地址。', 'error')
            return
          }
          insertMarkdownImage(url, altBase)
          pushSnackbar('图片已插入正文。', 'ok')
        } catch {
          pushSnackbar('图片上传失败，请稍后重试。', 'error')
        } finally {
          setStatusMessage('')
        }
      },
      [insertMarkdownImage, pushSnackbar]
    )

    const handleSceneChange = useCallback(
      (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
        const excalidrawModule = excalidrawModuleRef.current
        if (!excalidrawModule) {
          return
        }

        const nextFingerprint = buildSceneFingerprint(elements, files)
        // First onChange from Excalidraw is initialization snapshot, not a user edit.
        if (!baselineReadyRef.current) {
          baselineReadyRef.current = true
          contentFingerprintRef.current = nextFingerprint
          // serializeAsJSON 'database' mode drops the files map (see Excalidraw
          // json.ts: `type === 'local' ? filterOutDeletedFiles(...) : void 0`);
          // use 'local' so the uploaded MinIO references survive in the payload.
          pendingDraftJsonRef.current = excalidrawModule.serializeAsJSON(
            elements,
            appState,
            files,
            'local'
          )
          latestSceneRef.current = { elements, appState, files }
          setSyncState('SUCCESS')
          if (!isSubmitting && !isUploadingAssets) {
            setStatusMessage('编辑器已就绪。')
          }
          console.info(DEBUG_PREFIX, 'baseline scene initialized', {
            elements: elements.length,
            files: Object.keys(files).length,
          })
          return
        }

        if (nextFingerprint === contentFingerprintRef.current) {
          return
        }

        contentFingerprintRef.current = nextFingerprint
        const nextDraftJson = excalidrawModule.serializeAsJSON(elements, appState, files, 'local')
        pendingDraftJsonRef.current = nextDraftJson
        latestSceneRef.current = { elements, appState, files }
        setIsSceneDirty(true)
        setErrorMessage('')
        setSyncState('UPDATING')
        console.info(DEBUG_PREFIX, 'scene changed, mark dirty', {
          elements: elements.length,
          files: Object.keys(files).length,
        })
        if (!isSubmitting && !isUploadingAssets) {
          setStatusMessage('检测到画布变更，约 1 秒后同步状态。')
        }

        if (idleSyncTimerRef.current) {
          clearTimeout(idleSyncTimerRef.current)
        }
        idleSyncTimerRef.current = setTimeout(() => {
          const draft = pendingDraftJsonRef.current
          setDraftJson(draft)
          setIsSceneDirty(false)
          hasUnsavedCanvasRef.current = draft !== lastSavedDraftJsonRef.current
          setSyncState('SUCCESS')
          if (!isSubmittingRef.current && !isUploadingAssetsRef.current) {
            setStatusMessage('草稿已同步。')
          }
          console.info(DEBUG_PREFIX, 'idle sync completed', { draftLength: draft.length })
        }, AUTO_SYNC_IDLE_MS)
      },
      [isSubmitting, isUploadingAssets]
    )

    const uploadSceneAssets = useCallback(async (files: BinaryFiles) => {
      const nextFiles = { ...files }
      let uploadedCount = 0

      for (const [fileId, file] of Object.entries(nextFiles)) {
        if (uploadAbortRef.current) {
          throw new Error('图片上传流程已中断，请重新提交。')
        }

        if (!file?.dataURL || !isDataUrl(file.dataURL)) {
          continue
        }

        const inlineBytes = estimateBase64Bytes(file.dataURL)
        if (inlineBytes > MAX_UPLOAD_IMAGE_BYTES) {
          throw new Error(
            `图片体积超过 ${Math.round(MAX_UPLOAD_IMAGE_BYTES / 1024 / 1024)} MB，请压缩后重试。`
          )
        }

        setStatusMessage(`正在上传第 ${uploadedCount + 1} 张图片...`)
        const fileBlob = dataUrlToBlob(file.dataURL)
        const uploadResult = await uploadAdminAsset(
          fileBlob,
          `excalidraw-${fileId}.${inferImageExtension(file.mimeType)}`
        )
        const assetUrl = uploadResult?.data?.trim()

        if (!assetUrl) {
          throw new Error('图片上传成功但未返回可用地址。')
        }

        nextFiles[fileId] = {
          ...file,
          dataURL: assetUrl as typeof file.dataURL,
        }
        uploadedCount += 1
      }

      return {
        files: nextFiles,
        uploadedCount,
      }
    }, [])

    const handleCoverUpload = useCallback(
      async (file: File) => {
        if (isCoverUploading) return
        setIsCoverUploading(true)
        try {
          const result = await uploadAdminAsset(file, `cover-${Date.now()}-${file.name}`)
          const url = result?.data
          if (url) {
            updateField('coverImageUrl', url)
            setIsTextDirty(true)
            pushSnackbar('封面图上传成功。', 'ok')
          } else {
            pushSnackbar('上传失败：未获取到文件地址。', 'error')
          }
        } catch {
          pushSnackbar('封面图上传失败，请稍后重试。', 'error')
        } finally {
          setIsCoverUploading(false)
          if (coverUploadInputRef.current) {
            coverUploadInputRef.current.value = ''
          }
        }
      },
      [isCoverUploading, updateField, pushSnackbar]
    )

    const buildPayload = useCallback(
      async (action: SubmitAction): Promise<AdminArticleFormPayload> => {
        let scene = latestSceneRef.current
        const excalidrawModule = excalidrawModuleRef.current
        const sanitizedTitle = sanitizeText(formState.title)
        const sanitizedSummary = sanitizeText(formState.summary)
        const trimmedCoverImageUrl = formState.coverImageUrl.trim()
        const trimmedUrl = slugify(formState.url)

        if (action === 'publish' && !sanitizedTitle) {
          setFieldErrors((prev) => ({ ...prev, title: '发布前必须填写标题。' }))
          throw new Error('发布失败：标题不能为空。')
        }

        if (!excalidrawModule) {
          throw new Error('编辑器尚未加载完成，请稍后再试。')
        }

        // Always refresh from live Excalidraw API first.
        if (excalidrawApiRef.current) {
          const api = excalidrawApiRef.current as unknown as ExcalidrawApiLike
          const liveElements = api.getSceneElements?.()
          const liveAppState = api.getAppState?.()
          const liveFiles = api.getFiles?.()
          if (liveElements && liveAppState && liveFiles) {
            scene = {
              elements: liveElements,
              appState: liveAppState,
              files: liveFiles,
            }
            latestSceneRef.current = scene
            contentFingerprintRef.current = buildSceneFingerprint(liveElements, liveFiles)
            pendingDraftJsonRef.current = excalidrawModule.serializeAsJSON(
              liveElements,
              liveAppState,
              liveFiles,
              'local'
            )
            console.info(DEBUG_PREFIX, 'payload scene refreshed from api', {
              elements: liveElements.length,
              files: Object.keys(liveFiles).length,
            })
          }
        }

        if (!scene) {
          throw new Error(
            action === 'publish' ? '正文内容为空，无法发布。' : '画布内容为空，无法保存。'
          )
        }
        const activeElements = scene.elements.filter((element) => !element.isDeleted)
        if (action === 'publish' && !activeElements.length) {
          setFieldErrors((prev) => ({ ...prev, content: '正文内容为空。' }))
          throw new Error('正文内容为空，无法发布。')
        }

        setIsUploadingAssets(true)
        uploadAbortRef.current = false

        const uploadedScene = await uploadSceneAssets(scene.files)
        const nextDraftJson = excalidrawModule.serializeAsJSON(
          scene.elements,
          scene.appState,
          uploadedScene.files,
          'local'
        )

        if (nextDraftJson.includes('data:image') && nextDraftJson.length > MAX_INLINE_IMAGE_BYTES) {
          throw new Error('检测到仍有较大的内联图片未完成替换，请稍后重试。')
        }

        let previewImage: Blob | null = null
        try {
          const rawPreview = await excalidrawModule.exportToBlob({
            elements: activeElements,
            appState: {
              ...scene.appState,
              exportBackground: true,
            },
            files: uploadedScene.files,
            mimeType: 'image/png',
            exportPadding: PREVIEW_EXPORT_PADDING_PX,
          })
          const bgColor =
            (scene.appState as { viewBackgroundColor?: string } | undefined)?.viewBackgroundColor ||
            PREVIEW_FALLBACK_BG
          previewImage = await fitBlobToFixedSize(
            rawPreview,
            PREVIEW_IMAGE_WIDTH,
            PREVIEW_IMAGE_HEIGHT,
            bgColor
          )
        } catch (error) {
          console.warn(DEBUG_PREFIX, 'preview export failed, fallback without preview image', {
            raw: error instanceof Error ? { name: error.name, message: error.message } : error,
          })
        }

        latestSceneRef.current = {
          elements: scene.elements,
          appState: scene.appState,
          files: uploadedScene.files,
        }

        if (uploadedScene.uploadedCount > 0) {
          setStatusMessage(`已完成 ${uploadedScene.uploadedCount} 张图片上传，正在生成提交内容...`)
        }

        const parsedTags = formState.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)

        return {
          title: sanitizedTitle || '未命名草稿',
          url: trimmedUrl || `draft-${Date.now()}`,
          summary: sanitizedSummary,
          coverImageUrl: trimmedCoverImageUrl,
          draftJson: nextDraftJson,
          previewImage: previewImage || undefined,
          draftBodyMd: formState.draftBodyMd || undefined,
          coverCaption: formState.coverCaption || undefined,
          tags: parsedTags,
        }
      },
      [
        formState.coverImageUrl,
        formState.coverCaption,
        formState.draftBodyMd,
        formState.summary,
        formState.tags,
        formState.title,
        formState.url,
        uploadSceneAssets,
      ]
    )

    const bindArticleIdToUrl = useCallback((id: number) => {
      if (typeof window === 'undefined') {
        return
      }
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.set('articleId', String(id))
      nextUrl.searchParams.delete('mode')
      window.history.replaceState(null, '', nextUrl.toString())
    }, [])

    const handleSubmit = useCallback(
      async (action: SubmitAction, source: 'manual' | 'auto' = 'manual') => {
        if (submitInFlightRef.current) {
          console.info(DEBUG_PREFIX, 'skip duplicated submit', { action })
          return false
        }
        submitInFlightRef.current = true
        setIsSubmitting(true)
        setSubmittingAction(action)
        setIsUploadingAssets(false)
        setErrorMessage('')
        setSyncState('UPDATING')
        const draftProgressText = source === 'auto' ? '正在自动保存草稿...' : '正在保存草稿...'
        setStatusMessage(action === 'publish' ? '正在发布文章...' : draftProgressText)
        console.info(DEBUG_PREFIX, 'submit start', { action, isEditMode, currentArticleId })

        try {
          const payload = await buildPayload(action)

          if (isEditMode && currentArticleId) {
            await updateAdminArticle(currentArticleId, payload, action)
          } else {
            const createResult = await createAdminArticle(payload, action)
            const createdId = createResult?.data ?? null
            if (createdId) {
              setCurrentArticleId(createdId)
              bindArticleIdToUrl(createdId)
              onArticleIdResolved?.(createdId)
              setStatusMessage(
                action === 'publish'
                  ? `文章已发布（ID: ${createdId}）。`
                  : `草稿已保存（ID: ${createdId}）。`
              )
            }
          }

          setDraftJson(payload.draftJson)
          pendingDraftJsonRef.current = payload.draftJson
          lastSavedDraftJsonRef.current = payload.draftJson
          hasUnsavedCanvasRef.current = false
          setIsSceneDirty(false)
          setIsTextDirty(false)
          setSyncState('SUCCESS')
          if (action === 'publish') setIsPublished(true)
          const draftSuccessText = source === 'auto' ? '草稿已自动保存。' : '草稿已保存。'
          setStatusMessage(action === 'publish' ? '文章已提交发布。' : draftSuccessText)
          setLastSavedAt(
            new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          )
          const draftToastText = source === 'auto' ? '草稿已自动保存。' : '草稿已保存。'
          pushSnackbar(action === 'publish' ? '发布成功。' : draftToastText, 'ok')
          if (onSubmitSuccess && source === 'manual') {
            await onSubmitSuccess(action)
          }
          console.info(DEBUG_PREFIX, 'submit success', { action })
          return true
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message || '提交失败，请稍后重试。'
              : typeof error === 'string'
                ? error
                : '提交失败，请稍后重试。'
          setErrorMessage(message)
          setSyncState('FAILED')
          setStatusMessage('提交未完成。')
          pushSnackbar(message, 'error')
          // Keep debugging signal without triggering Next.js console-error overlay.
          console.warn(DEBUG_PREFIX, 'submit failed', {
            action,
            message,
            raw:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : error,
          })
          return false
        } finally {
          submitInFlightRef.current = false
          setIsSubmitting(false)
          setSubmittingAction(null)
          setIsUploadingAssets(false)
          uploadAbortRef.current = true
        }
      },
      [
        bindArticleIdToUrl,
        buildPayload,
        currentArticleId,
        isEditMode,
        onArticleIdResolved,
        onSubmitSuccess,
        pushSnackbar,
      ]
    )

    useEffect(() => {
      const hasUnsavedCanvas = draftJson !== lastSavedDraftJsonRef.current
      if (
        (!isSceneDirty && !isTextDirty && !hasUnsavedCanvas) ||
        isSubmitting ||
        isUploadingAssets
      ) {
        return
      }
      const timer = setTimeout(async () => {
        if (autoSaveLockRef.current || submitInFlightRef.current) return
        autoSaveLockRef.current = true
        try {
          await handleSubmit('draft', 'auto')
        } finally {
          autoSaveLockRef.current = false
        }
      }, AUTO_SAVE_TO_SERVER_MS)
      return () => clearTimeout(timer)
    }, [handleSubmit, isSceneDirty, isTextDirty, isSubmitting, isUploadingAssets, draftJson])

    useEffect(() => {
      const onSaveShortcut = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase()
        if ((event.ctrlKey || event.metaKey) && !event.shiftKey && key === 's') {
          event.preventDefault()
          void handleSubmit('draft')
        }
      }
      window.addEventListener('keydown', onSaveShortcut)
      return () => window.removeEventListener('keydown', onSaveShortcut)
    }, [handleSubmit])

    useEffect(() => {
      const scene = latestSceneRef.current
      if (!scene || inlineAssetSanitizingRef.current) return
      const hasInlineAssets = Object.values(scene.files || {}).some((file) =>
        isDataUrl(file?.dataURL)
      )
      if (!hasInlineAssets) return

      inlineAssetSanitizingRef.current = true
      ;(async () => {
        try {
          const uploaded = await uploadSceneAssets(scene.files)
          latestSceneRef.current = { ...scene, files: uploaded.files }
          const api = excalidrawApiRef.current as unknown as ExcalidrawApiLike
          api?.updateScene?.({ files: uploaded.files })
          setStatusMessage('已自动替换内联图片为远程 URL。')
        } catch (error) {
          const message = error instanceof Error ? error.message : '自动上传内联图片失败。'
          setErrorMessage(message)
          pushSnackbar(message, 'error')
        } finally {
          inlineAssetSanitizingRef.current = false
        }
      })()
    }, [draftJson, pushSnackbar, uploadSceneAssets])

    useImperativeHandle(
      ref,
      () => ({
        saveDraft: async () => {
          return await handleSubmit('draft')
        },
        publish: async () => {
          return await handleSubmit('publish')
        },
        isBusy: () => isSubmitting,
        hasPendingChanges: () =>
          isSceneDirtyRef.current || isTextDirtyRef.current || hasUnsavedCanvasRef.current,
      }),
      [handleSubmit, isSubmitting]
    )

    useEffect(() => {
      let active = true
      import('@excalidraw/excalidraw').then((mod) => {
        if (active) {
          excalidrawModuleRef.current = mod
        }
      })

      return () => {
        active = false
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const autoSyncTimer = autoSyncTimerRef.current

        const idleSyncTimer = idleSyncTimerRef.current
        const slugCheckTimer = slugCheckTimerRef.current
        if (autoSyncTimer) {
          clearInterval(autoSyncTimer)
        }
        if (idleSyncTimer) {
          clearTimeout(idleSyncTimer)
        }
        if (slugCheckTimer) {
          clearTimeout(slugCheckTimer)
        }
      }
    }, [])

    return (
      <>
        <div className="space-y-8">
          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <aside className="border-wb-rule-soft/90 bg-wb-canvas/95 no-scrollbar relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_28px_90px_-42px_rgba(31,26,21,0.3)] backdrop-blur xl:sticky xl:top-[4.5rem] xl:max-h-[calc(100vh-5.5rem)] xl:self-start xl:overflow-y-auto dark:border-gray-800 dark:bg-gray-900/85">
              <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.12),transparent_58%),radial-gradient(circle_at_top_right,rgba(201,181,151,0.10),transparent_42%)]" />
              <div className="relative space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="border-wb-rule bg-wb-paper text-wb-accent inline-flex rounded-full border px-4 py-1 text-[11px] font-semibold tracking-[0.28em] uppercase dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      Editor Control
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${statusBadgeClass}`}
                    >
                      <StatusDot tone={syncState} />
                      {syncStateLabel[syncState]}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-wb-ink text-2xl font-black tracking-tight dark:text-gray-50">
                      {isEditMode ? '编辑既有文章' : '创建新文章'}
                    </h2>
                    <p className="text-wb-meta text-sm leading-7 dark:text-gray-300">
                      填写标题与 Slug 后保存草稿，满意时直接发布；文字变更约 4 秒后自动保存，画布请
                      Ctrl+S 手动保存。
                    </p>
                  </div>
                </div>

                <div className="border-wb-rule-soft/80 bg-wb-canvas/80 grid gap-4 rounded-[1.75rem] border p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-gray-800 dark:bg-gray-950/60">
                  <label className="group block space-y-2.5">
                    <span className="text-wb-ink text-sm font-semibold dark:text-gray-200">
                      标题
                    </span>
                    <input
                      value={formState.title}
                      maxLength={120}
                      onChange={(event) => updateField('title', event.target.value)}
                      placeholder="输入文章标题"
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus={!article?.articleId}
                      className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta hover:border-wb-rule focus:border-wb-accent focus:ring-wb-accent/10 dark:focus:border-wb-accent/70 w-full rounded-2xl border px-4 py-3.5 text-sm shadow-sm transition duration-200 ease-out outline-none focus:ring-4 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
                    />
                    {fieldErrors.title ? (
                      <p className="text-xs text-rose-600 dark:text-rose-300">
                        {fieldErrors.title}
                      </p>
                    ) : null}
                    <FieldHint>标题会用于列表展示与默认 slug 生成。</FieldHint>
                  </label>

                  <label className="group block space-y-2.5">
                    <span className="text-wb-ink text-sm font-semibold dark:text-gray-200">
                      Slug
                    </span>
                    <input
                      value={formState.url}
                      maxLength={120}
                      onChange={(event) => updateField('url', event.target.value)}
                      placeholder="例如：sealpi-excalidraw-notes"
                      className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta hover:border-wb-rule focus:border-wb-accent focus:ring-wb-accent/10 dark:focus:border-wb-accent/70 w-full rounded-2xl border px-4 py-3.5 text-sm shadow-sm transition duration-200 ease-out outline-none focus:ring-4 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
                    />
                    <FieldHint>
                      新建时随标题自动生成（中文转拼音）。若已手动修改
                      slug，改标题不再覆盖；清空本框可恢复跟随标题。
                    </FieldHint>
                    {slugCheck === 'checking' ? (
                      <p className="text-wb-meta animate-pulse text-xs dark:text-gray-400">
                        检查 Slug 可用性…
                      </p>
                    ) : slugCheck === 'taken' ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠ 此 Slug 已被占用，发布时将返回 409 冲突错误。
                      </p>
                    ) : slugCheck === 'available' ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        ✓ Slug 可用。
                      </p>
                    ) : null}
                  </label>

                  <label className="group block space-y-2.5">
                    <span className="text-wb-ink text-sm font-semibold dark:text-gray-200">
                      摘要
                    </span>
                    <textarea
                      value={formState.summary}
                      maxLength={220}
                      onChange={(event) => updateField('summary', event.target.value)}
                      rows={4}
                      placeholder="用于文章列表与 SEO 的简述"
                      className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta hover:border-wb-rule focus:border-wb-accent focus:ring-wb-accent/10 dark:focus:border-wb-accent/70 w-full rounded-2xl border px-4 py-3.5 text-sm leading-7 shadow-sm transition duration-200 ease-out outline-none focus:ring-4 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
                    />
                    <div className="flex items-center justify-between">
                      <FieldHint>建议控制在 80-140 字，兼顾卡片摘要与元信息展示。</FieldHint>
                      <p
                        className={`text-right text-xs tabular-nums ${
                          formState.summary.length > 180
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-wb-meta dark:text-gray-500'
                        }`}
                      >
                        {formState.summary.length} / 220
                      </p>
                    </div>
                  </label>

                  <div className="space-y-2.5">
                    <label
                      htmlFor="editor-tags-input"
                      className="text-wb-ink text-sm font-semibold dark:text-gray-200"
                    >
                      标签
                    </label>
                    <input
                      id="editor-tags-input"
                      value={formState.tags}
                      onChange={(event) => updateField('tags', event.target.value)}
                      placeholder="spring, ddd, architecture"
                      className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta hover:border-wb-rule focus:border-wb-accent focus:ring-wb-accent/10 dark:focus:border-wb-accent/70 w-full rounded-2xl border px-4 py-3.5 text-sm shadow-sm transition duration-200 ease-out outline-none focus:ring-4 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
                    />
                    {existingTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {existingTags.map((t) => {
                          const active = formState.tags
                            .split(',')
                            .map((x) => x.trim())
                            .includes(t)
                          return (
                            <button
                              key={t}
                              type="button"
                              disabled={active}
                              onClick={() => {
                                const existing = formState.tags
                                  .split(',')
                                  .map((x) => x.trim())
                                  .filter(Boolean)
                                if (!existing.includes(t)) {
                                  updateField('tags', [...existing, t].join(', '))
                                }
                              }}
                              className={`focus-visible:ring-wb-accent rounded border px-2 py-0.5 font-mono text-[10px] font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none active:scale-95 ${
                                active
                                  ? 'border-wb-accent/40 bg-wb-accent/10 text-wb-accent dark:border-wb-accent/30 dark:bg-wb-accent/10 cursor-default'
                                  : 'border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200'
                              }`}
                            >
                              #{t}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <FieldHint>多个标签用英文逗号分隔，保存时全量覆盖。</FieldHint>
                      {formState.tags.trim() ? (
                        <p className="text-wb-meta shrink-0 text-right text-xs tabular-nums dark:text-gray-500">
                          已选{' '}
                          {
                            formState.tags
                              .split(',')
                              .map((x) => x.trim())
                              .filter(Boolean).length
                          }{' '}
                          个
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-wb-ink text-sm font-semibold dark:text-gray-200">
                        封面图 URL
                      </span>
                      <button
                        type="button"
                        disabled={isCoverUploading}
                        onClick={() => coverUploadInputRef.current?.click()}
                        className="border-wb-rule-soft text-wb-meta hover:border-wb-rule hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-300 focus-visible:ring-1 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-200"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        {isCoverUploading ? '上传中...' : '上传图片'}
                      </button>
                      <input
                        ref={coverUploadInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) void handleCoverUpload(file)
                        }}
                      />
                    </div>
                    <input
                      value={formState.coverImageUrl}
                      onChange={(event) => updateField('coverImageUrl', event.target.value)}
                      placeholder="可选；为空时使用自动导出的预览图"
                      className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta hover:border-wb-rule focus:border-wb-accent focus:ring-wb-accent/10 dark:focus:border-wb-accent/70 w-full rounded-2xl border px-4 py-3.5 text-sm shadow-sm transition duration-200 ease-out outline-none focus:ring-4 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
                    />
                    {formState.coverImageUrl.trim() &&
                    (formState.coverImageUrl.startsWith('http') ||
                      formState.coverImageUrl.startsWith('/')) ? (
                      <div className="border-wb-rule-soft overflow-hidden rounded-xl border dark:border-gray-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formState.coverImageUrl}
                          alt="封面图预览"
                          className="h-24 w-full object-cover"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    ) : null}
                    <FieldHint>如已上传 OSS，可直接覆写自动生成的预览图地址。</FieldHint>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <div className="border-wb-rule-soft/80 bg-wb-paper/90 rounded-[1.75rem] border p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
                    <div className="text-wb-meta flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                      <StatusDot tone={syncState} />
                      当前状态
                    </div>
                    <p className="text-wb-meta mt-3 text-sm leading-7 dark:text-gray-200">
                      {syncStateLabel[syncState]}
                    </p>
                    <p className="text-wb-meta mt-1 text-xs leading-6 tabular-nums dark:text-gray-400">
                      {statusMessage}
                      {lastSavedAt ? ` 最近保存于 ${lastSavedAt}` : ''}
                    </p>
                    {errorMessage ? (
                      <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                        {errorMessage}
                      </div>
                    ) : null}
                  </div>

                  <div className="border-wb-rule-soft/80 bg-wb-canvas/90 rounded-[1.75rem] border p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                    <p className="text-wb-meta text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                      内容指标
                    </p>
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                      <div>
                        <dt className="text-wb-meta text-xs dark:text-gray-400">draftJson 大小</dt>
                        <dd className="text-wb-ink mt-1 text-lg font-bold tabular-nums dark:text-gray-50">
                          {draftJson ? `${Math.round(draftJson.length / 1024) || 1} KB` : '未生成'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-wb-meta text-xs dark:text-gray-400">正文字数</dt>
                        <dd className="text-wb-ink mt-1 text-lg font-bold tabular-nums dark:text-gray-50">
                          {formState.draftBodyMd.trim()
                            ? `${formState.draftBodyMd.replace(/\s+/g, '').length} 字`
                            : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-wb-meta text-xs dark:text-gray-400">预计阅读</dt>
                        <dd className="text-wb-ink mt-1 text-lg font-bold tabular-nums dark:text-gray-50">
                          {(() => {
                            const mins = estimateReadMinutes(formState.draftBodyMd)
                            return mins !== undefined ? `${mins} 分钟` : '—'
                          })()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-wb-meta text-xs dark:text-gray-400">图片上传</dt>
                        <dd className="text-wb-ink mt-1 text-lg font-bold dark:text-gray-50">
                          {isUploadingAssets ? '处理中' : '待命'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                  <div className="flex flex-col items-stretch gap-1">
                    <button
                      type="button"
                      disabled={isSubmitting || isUploadingAssets}
                      onClick={() => void handleSubmit('draft')}
                      className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.55)] ring-4 ring-transparent transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-gray-800 focus-visible:ring-gray-200 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200 dark:focus-visible:ring-gray-700"
                    >
                      {submittingAction === 'draft' ? '保存中...' : '保存草稿'}
                    </button>
                    <p className="text-wb-meta/50 text-center text-xs dark:text-gray-600">
                      ⌘S / Ctrl+S
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting || isUploadingAssets}
                    onClick={() => void handleSubmit('publish')}
                    className="border-wb-rule text-wb-accent hover:border-wb-accent hover:text-wb-accent focus-visible:ring-wb-accent/30 dark:border-wb-accent/40 dark:text-wb-accent/80 inline-flex items-center justify-center rounded-full border bg-[linear-gradient(135deg,rgba(251,245,236,0.95),rgba(245,236,225,0.90))] px-5 py-3.5 text-sm font-semibold shadow-[0_18px_38px_-24px_rgba(166,88,43,0.30)] ring-4 ring-transparent transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(245,236,225,0.98),rgba(237,223,207,0.95))] focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-[linear-gradient(135deg,rgba(166,88,43,0.10),rgba(166,88,43,0.06))] dark:hover:bg-[linear-gradient(135deg,rgba(166,88,43,0.20),rgba(166,88,43,0.14))]"
                  >
                    {submittingAction === 'publish' ? '发布中...' : '直接发布'}
                  </button>
                  {fieldErrors.content ? (
                    <p className="text-xs text-rose-600 dark:text-rose-300">
                      {fieldErrors.content}
                    </p>
                  ) : null}
                  {currentArticleId ? (
                    <a
                      href={`/admin/preview/${currentArticleId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-wb-rule text-wb-meta hover:border-wb-rule hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center justify-center gap-1.5 rounded-full border px-5 py-3.5 text-sm font-medium transition duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none dark:border-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                    >
                      预览草稿
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : null}
                  {isPublished && formState.url ? (
                    <a
                      href={`/blog/${formState.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-wb-rule text-wb-accent hover:border-wb-accent focus-visible:ring-wb-accent dark:border-wb-accent/40 dark:text-wb-accent/80 inline-flex items-center justify-center gap-1.5 rounded-full border px-5 py-3.5 text-sm font-medium transition duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      查看前台
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : null}
                </div>
              </div>
            </aside>

            <div className="border-wb-rule-soft bg-wb-canvas overflow-hidden rounded-[2rem] border shadow-[0_28px_90px_-42px_rgba(31,26,21,0.28)] dark:border-gray-800 dark:bg-gray-900/80">
              <div className="border-wb-rule-soft/60 flex flex-col gap-4 border-b bg-[linear-gradient(135deg,rgba(166,88,43,0.06),rgba(251,245,236,0.95))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-[linear-gradient(135deg,rgba(166,88,43,0.10),rgba(15,23,42,0.92))]">
                <div>
                  <p className="text-wb-accent text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                    Excalidraw Canvas
                  </p>
                  <p className="text-wb-meta mt-2 text-sm leading-7 dark:text-gray-300">
                    支持直接绘制、序列化为数据库 JSON，并在提交时导出预览图。
                  </p>
                </div>
                <div className="border-wb-rule bg-wb-canvas/85 text-wb-meta inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm dark:border-gray-700 dark:bg-gray-950/80 dark:text-gray-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  画板就绪
                </div>
              </div>
              <div className="h-[72vh] min-h-[680px] bg-[linear-gradient(180deg,rgba(251,245,236,0.95),rgba(245,236,225,0.98))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.6),rgba(15,23,42,0.65))]">
                <Excalidraw
                  initialData={initialData}
                  excalidrawAPI={(api) => {
                    excalidrawApiRef.current = api
                  }}
                  onChange={handleSceneChange}
                  viewModeEnabled={false}
                />
              </div>
              <div className="border-wb-rule-soft/60 bg-wb-canvas/90 mt-4 space-y-4 rounded-xl border p-5 dark:border-gray-800/60 dark:bg-gray-950/80">
                <label className="block space-y-2.5">
                  <span className="text-wb-meta text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                    画布注释（Caveat 手写体显示）
                  </span>
                  <input
                    type="text"
                    value={formState.coverCaption}
                    onChange={(e) => {
                      setFormState((prev) => ({ ...prev, coverCaption: e.target.value }))
                      setIsTextDirty(true)
                    }}
                    maxLength={200}
                    placeholder="例：DDD 分层一张图就够了"
                    className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta hover:border-wb-rule focus:border-wb-accent focus:ring-wb-accent/10 dark:focus:border-wb-accent/70 w-full rounded-2xl border px-4 py-3 text-sm shadow-sm transition duration-200 ease-out outline-none focus:ring-4 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
                  />
                  <p className="text-wb-meta text-right text-xs tabular-nums dark:text-gray-500">
                    {formState.coverCaption.length} / 200
                  </p>
                </label>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-wb-meta text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                      Markdown 正文
                    </span>
                    <div className="border-wb-rule-soft flex overflow-hidden rounded-full border text-[11px] font-semibold dark:border-gray-700">
                      <button
                        type="button"
                        aria-pressed={!showMdPreview}
                        onClick={() => setShowMdPreview(false)}
                        className={`px-3 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none focus-visible:ring-inset dark:focus-visible:ring-gray-500 ${
                          !showMdPreview
                            ? 'bg-wb-ink text-wb-paper dark:bg-white dark:text-gray-950'
                            : 'text-wb-meta hover:text-wb-ink dark:text-gray-400 dark:hover:text-gray-100'
                        }`}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        aria-pressed={showMdPreview}
                        onClick={() => setShowMdPreview(true)}
                        className={`px-3 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none focus-visible:ring-inset dark:focus-visible:ring-gray-500 ${
                          showMdPreview
                            ? 'bg-wb-ink text-wb-paper dark:bg-white dark:text-gray-950'
                            : 'text-wb-meta hover:text-wb-ink dark:text-gray-400 dark:hover:text-gray-100'
                        }`}
                      >
                        预览
                      </button>
                    </div>
                  </div>
                  {showMdPreview ? (
                    <div className="content-enter border-wb-rule-soft bg-wb-canvas min-h-[200px] rounded-2xl border px-4 py-3 dark:border-gray-700 dark:bg-gray-950">
                      {formState.draftBodyMd.trim() ? (
                        <BodyMarkdown markdown={formState.draftBodyMd} />
                      ) : (
                        <p className="text-wb-meta text-sm italic dark:text-gray-500">
                          暂无正文内容。
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="border-wb-rule-soft bg-wb-canvas overflow-hidden rounded-2xl border shadow-sm dark:border-gray-700 dark:bg-gray-950">
                      <div className="border-wb-rule-soft/60 flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 dark:border-gray-700/60">
                        <MdToolbarButton
                          title="粗体 (**text**) — Ctrl+B"
                          onClick={() => insertMd('**', '**', '粗体')}
                        >
                          <b>B</b>
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="斜体 (*text*) — Ctrl+I"
                          onClick={() => insertMd('*', '*', '斜体')}
                        >
                          <i>I</i>
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="行内代码 — Ctrl+`"
                          onClick={() => insertMd('`', '`', 'code')}
                        >
                          {'</>'}
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="删除线 (~~text~~) — Ctrl+Shift+S"
                          onClick={() => insertMd('~~', '~~', '删除线')}
                        >
                          <s>S</s>
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="链接 [text](url) — Ctrl+K"
                          onClick={() => insertMd('[', '](url)', '链接文字')}
                        >
                          Lnk
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="图片 ![alt](url)"
                          onClick={() => insertMd('![', '](url)', '图片描述')}
                        >
                          Img
                        </MdToolbarButton>
                        <span className="bg-wb-rule-soft mx-0.5 h-3.5 w-px shrink-0 dark:bg-gray-700" />
                        <MdToolbarButton
                          title="二级标题（可切换） — Ctrl+Shift+2"
                          onClick={() => toggleMdLinePrefix('## ')}
                        >
                          H2
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="三级标题（可切换） — Ctrl+Shift+3"
                          onClick={() => toggleMdLinePrefix('### ')}
                        >
                          H3
                        </MdToolbarButton>
                        <MdToolbarButton title="引用块" onClick={() => insertMdLine('> ')}>
                          &ldquo;
                        </MdToolbarButton>
                        <MdToolbarButton title="无序列表" onClick={() => insertMdLine('- ')}>
                          ul
                        </MdToolbarButton>
                        <MdToolbarButton title="有序列表" onClick={() => insertMdLine('1. ')}>
                          ol
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="代码块（光标落在围栏内部）— Ctrl+Shift+`"
                          onClick={() => insertMdBlock('```\n\n```', 4)}
                        >
                          {'{}'}
                        </MdToolbarButton>
                        <MdToolbarButton title="分割线" onClick={() => insertMdBlock('---')}>
                          hr
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="表格（3列模板）"
                          onClick={() =>
                            insertMdBlock(
                              '| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |',
                              2
                            )
                          }
                        >
                          tbl
                        </MdToolbarButton>
                        <span className="bg-wb-rule-soft mx-0.5 h-3.5 w-px shrink-0 dark:bg-gray-700" />
                        <MdToolbarButton
                          title="[!NOTE] 告示块"
                          onClick={() => insertMdBlock('> [!NOTE]\n> ', 12)}
                        >
                          NOTE
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="[!TIP] 告示块"
                          onClick={() => insertMdBlock('> [!TIP]\n> ', 11)}
                        >
                          TIP
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="[!IMPORTANT] 告示块"
                          onClick={() => insertMdBlock('> [!IMPORTANT]\n> ', 17)}
                        >
                          IMP
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="[!WARNING] 告示块"
                          onClick={() => insertMdBlock('> [!WARNING]\n> ', 15)}
                        >
                          WARN
                        </MdToolbarButton>
                        <MdToolbarButton
                          title="[!CAUTION] 告示块"
                          onClick={() => insertMdBlock('> [!CAUTION]\n> ', 15)}
                        >
                          CAUT
                        </MdToolbarButton>
                      </div>
                      <textarea
                        ref={mdTextareaRef}
                        value={formState.draftBodyMd}
                        onChange={(e) => {
                          setFormState((prev) => ({ ...prev, draftBodyMd: e.target.value }))
                          setIsTextDirty(true)
                        }}
                        onKeyDown={(e) => {
                          const el = e.currentTarget
                          // Tab / Shift+Tab — indent/unindent (2 spaces)
                          if (e.key === 'Tab') {
                            e.preventDefault()
                            const start = el.selectionStart
                            const end = el.selectionEnd
                            const val = el.value
                            if (start === end) {
                              // No selection: insert 2 spaces at cursor
                              const next = val.slice(0, start) + '  ' + val.slice(end)
                              setFormState((prev) => ({ ...prev, draftBodyMd: next }))
                              setIsTextDirty(true)
                              requestAnimationFrame(() => {
                                el.focus()
                                el.setSelectionRange(start + 2, start + 2)
                              })
                            } else {
                              // Selection spans lines: indent or unindent each line
                              const lineStart = val.lastIndexOf('\n', start - 1) + 1
                              const chunk = val.slice(lineStart, end)
                              const lines = chunk.split('\n')
                              const processed = e.shiftKey
                                ? lines.map((l) => (l.startsWith('  ') ? l.slice(2) : l))
                                : lines.map((l) => '  ' + l)
                              const replaced = processed.join('\n')
                              const next = val.slice(0, lineStart) + replaced + val.slice(end)
                              const delta = replaced.length - chunk.length
                              setFormState((prev) => ({ ...prev, draftBodyMd: next }))
                              setIsTextDirty(true)
                              requestAnimationFrame(() => {
                                el.focus()
                                el.setSelectionRange(start + (e.shiftKey ? 0 : 2), end + delta)
                              })
                            }
                            return
                          }
                          // Enter — continue list on next line
                          if (e.key === 'Enter') {
                            const pos = el.selectionStart
                            const end = el.selectionEnd
                            const val = el.value
                            // Only intercept when no selection and cursor is at EOL
                            if (pos === end) {
                              const lineStart = val.lastIndexOf('\n', pos - 1) + 1
                              const lineEnd = val.indexOf('\n', pos)
                              const atEol = pos === (lineEnd === -1 ? val.length : lineEnd)
                              if (atEol) {
                                const currentLine = val.slice(lineStart, pos)
                                const ulMatch = currentLine.match(/^(\s*)([-*+]) /)
                                const olMatch = !ulMatch && currentLine.match(/^(\s*)(\d+)\. /)
                                if (ulMatch) {
                                  e.preventDefault()
                                  const content = currentLine.slice(ulMatch[0].length)
                                  if (!content.trim()) {
                                    // Empty item: exit list
                                    const next = val.slice(0, lineStart) + '\n' + val.slice(pos)
                                    setFormState((prev) => ({ ...prev, draftBodyMd: next }))
                                    setIsTextDirty(true)
                                    requestAnimationFrame(() => {
                                      el.focus()
                                      el.setSelectionRange(lineStart + 1, lineStart + 1)
                                    })
                                  } else {
                                    const prefix = `${ulMatch[1]}${ulMatch[2]} `
                                    const next = val.slice(0, pos) + '\n' + prefix + val.slice(pos)
                                    setFormState((prev) => ({ ...prev, draftBodyMd: next }))
                                    setIsTextDirty(true)
                                    requestAnimationFrame(() => {
                                      el.focus()
                                      el.setSelectionRange(
                                        pos + 1 + prefix.length,
                                        pos + 1 + prefix.length
                                      )
                                    })
                                  }
                                  return
                                }
                                if (olMatch) {
                                  e.preventDefault()
                                  const content = currentLine.slice(olMatch[0].length)
                                  if (!content.trim()) {
                                    // Empty item: exit list
                                    const next = val.slice(0, lineStart) + '\n' + val.slice(pos)
                                    setFormState((prev) => ({ ...prev, draftBodyMd: next }))
                                    setIsTextDirty(true)
                                    requestAnimationFrame(() => {
                                      el.focus()
                                      el.setSelectionRange(lineStart + 1, lineStart + 1)
                                    })
                                  } else {
                                    const nextNum = parseInt(olMatch[2], 10) + 1
                                    const prefix = `${olMatch[1]}${nextNum}. `
                                    const next = val.slice(0, pos) + '\n' + prefix + val.slice(pos)
                                    setFormState((prev) => ({ ...prev, draftBodyMd: next }))
                                    setIsTextDirty(true)
                                    requestAnimationFrame(() => {
                                      el.focus()
                                      el.setSelectionRange(
                                        pos + 1 + prefix.length,
                                        pos + 1 + prefix.length
                                      )
                                    })
                                  }
                                  return
                                }
                              }
                            }
                          }
                          if (!(e.ctrlKey || e.metaKey)) return
                          const key = e.key.toLowerCase()
                          if (key === 'b') {
                            e.preventDefault()
                            insertMd('**', '**', '粗体')
                          } else if (key === 'i') {
                            e.preventDefault()
                            insertMd('*', '*', '斜体')
                          } else if (key === 'k') {
                            e.preventDefault()
                            insertMd('[', '](url)', '链接文字')
                          } else if (e.key === '`') {
                            e.preventDefault()
                            if (e.shiftKey) {
                              insertMdBlock('```\n\n```', 4)
                            } else {
                              insertMd('`', '`', 'code')
                            }
                          } else if (key === 's' && e.shiftKey) {
                            e.preventDefault()
                            insertMd('~~', '~~', '删除线')
                          } else if (e.key === '2' && e.shiftKey) {
                            e.preventDefault()
                            toggleMdLinePrefix('## ')
                          } else if (e.key === '3' && e.shiftKey) {
                            e.preventDefault()
                            toggleMdLinePrefix('### ')
                          }
                        }}
                        onPaste={(e) => {
                          const items = e.clipboardData?.items
                          if (!items || items.length === 0) return
                          const images: File[] = []
                          for (let i = 0; i < items.length; i += 1) {
                            const item = items[i]
                            if (item.kind === 'file' && item.type.startsWith('image/')) {
                              const f = item.getAsFile()
                              if (f) images.push(f)
                            }
                          }
                          if (images.length === 0) return
                          e.preventDefault()
                          images.forEach((f) => {
                            void uploadAndInsertMarkdownImage(f)
                          })
                        }}
                        onDragOver={(e) => {
                          if (
                            Array.from(e.dataTransfer?.items || []).some((it) => it.kind === 'file')
                          ) {
                            e.preventDefault()
                          }
                        }}
                        onDrop={(e) => {
                          const files = e.dataTransfer?.files
                          if (!files || files.length === 0) return
                          const images = Array.from(files).filter((f) =>
                            f.type.startsWith('image/')
                          )
                          if (images.length === 0) return
                          e.preventDefault()
                          images.forEach((f) => {
                            void uploadAndInsertMarkdownImage(f)
                          })
                        }}
                        placeholder={
                          '# 正文\n\n支持 Markdown 与 GitHub 告示块（> [!NOTE] / > [!TIP] / > [!IMPORTANT] / > [!WARNING] / > [!CAUTION]）。\n粘贴或拖拽图片直接上传，上传成功后自动插入 ![alt](url)。\n快捷键：Ctrl+B 粗体 | Ctrl+I 斜体 | Ctrl+Shift+S 删除线 | Ctrl+K 链接 | Ctrl+` 行内代码 | Ctrl+Shift+` 代码块 | Ctrl+Shift+2 H2 | Ctrl+Shift+3 H3'
                        }
                        className="content-enter text-wb-ink placeholder:text-wb-meta hover:border-wb-rule focus:border-wb-accent focus:ring-wb-accent/10 dark:focus:border-wb-accent/70 min-h-[200px] w-full resize-y bg-transparent px-4 py-3 font-mono text-sm transition duration-200 ease-out outline-none focus:ring-4 dark:text-gray-100 dark:placeholder:text-gray-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {snackbar.show ? (
          <div
            className={`toast-enter fixed right-4 bottom-4 z-[85] max-w-xs rounded-xl border px-4 py-3 text-sm shadow-lg ${
              snackbar.tone === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
            }`}
          >
            {snackbar.message}
          </div>
        ) : null}
      </>
    )
  }
)

export default AdminEditorClient
