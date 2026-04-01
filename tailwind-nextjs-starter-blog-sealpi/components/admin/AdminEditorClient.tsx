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

import {
  createAdminArticle,
  type AdminArticleFormPayload,
  updateAdminArticle,
  uploadAdminAsset,
} from '@/lib/admin-api'
import type { AdminArticle } from '@/lib/blog-api-types'
import { useSession } from 'next-auth/react'

type SubmitAction = 'draft' | 'publish'
type ExcalidrawModule = typeof import('@excalidraw/excalidraw')
type SyncState = 'SUCCESS' | 'UPDATING' | 'FAILED'
type ExcalidrawApiLike = {
  getSceneElements?: () => readonly ExcalidrawElement[]
  getAppState?: () => AppState
  getFiles?: () => BinaryFiles
}

const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw')
    return mod.Excalidraw
  },
  { ssr: false }
)

const MAX_INLINE_IMAGE_BYTES = 200 * 1024
const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024
const AUTO_SYNC_IDLE_MS = 1200
const DEBUG_PREFIX = '[AdminEditor]'

type EditorState = {
  title: string
  url: string
  summary: string
  coverImageUrl: string
}

type AdminEditorClientProps = {
  article?: AdminArticle | null
  onSubmitSuccess?: (action: SubmitAction) => void | Promise<void>
}

export type AdminEditorClientRef = {
  saveDraft: () => Promise<boolean>
  publish: () => Promise<boolean>
  isBusy: () => boolean
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
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
  return {
    title: article?.title || '',
    url: article?.url || '',
    summary: article?.summary || '',
    coverImageUrl: article?.coverImageUrl || '',
  }
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-6 text-gray-500 dark:text-gray-400">{children}</p>
}

function StatusDot({ tone }: { tone: SyncState }) {
  const toneClass = {
    SUCCESS: 'bg-emerald-400',
    UPDATING: 'bg-amber-400',
    FAILED: 'bg-rose-400',
  }[tone]

  return <span className={`inline-flex h-2.5 w-2.5 rounded-full ${toneClass}`} />
}

const AdminEditorClient = forwardRef<AdminEditorClientRef, AdminEditorClientProps>(
  function AdminEditorClient({ article, onSubmitSuccess }, ref) {
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
    const pendingDraftJsonRef = useRef<string>(article?.draftJson || article?.contentJson || '')
    const contentFingerprintRef = useRef<string>('')
    const baselineReadyRef = useRef(false)
    const isSceneDirtyRef = useRef(false)
    const isSubmittingRef = useRef(false)
    const isUploadingAssetsRef = useRef(false)

    const [formState, setFormState] = useState<EditorState>(() => getInitialState(article))
    const [draftJson, setDraftJson] = useState<string>(
      article?.draftJson || article?.contentJson || ''
    )
    const [statusMessage, setStatusMessage] = useState<string>('编辑器已就绪，可开始绘制。')
    const [errorMessage, setErrorMessage] = useState<string>('')
    const [syncState, setSyncState] = useState<SyncState>('SUCCESS')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSceneDirty, setIsSceneDirty] = useState(false)
    const [isUploadingAssets, setIsUploadingAssets] = useState(false)
    const { data: session } = useSession()
    const adminAccessToken = session?.accessToken
    useEffect(() => {
      isSceneDirtyRef.current = isSceneDirty
    }, [isSceneDirty])

    useEffect(() => {
      isSubmittingRef.current = isSubmitting
    }, [isSubmitting])

    useEffect(() => {
      isUploadingAssetsRef.current = isUploadingAssets
    }, [isUploadingAssets])


    const isEditMode = Boolean(article?.articleId)
    const articleId = article?.articleId ? Number(article.articleId) : null

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
      UPDATING:
        'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200',
      FAILED:
        'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
    }[syncState]

    const updateField = useCallback((key: keyof EditorState, value: string) => {
      setFormState((current) => {
        if (key === 'title') {
          const nextTitle = value
          const nextUrl = current.url.trim() ? current.url : slugify(nextTitle)
          return {
            ...current,
            title: nextTitle,
            url: nextUrl,
          }
        }

        return {
          ...current,
          [key]: value,
        }
      })
    }, [])

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
          pendingDraftJsonRef.current = excalidrawModule.serializeAsJSON(
            elements,
            appState,
            files,
            'database'
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
        const nextDraftJson = excalidrawModule.serializeAsJSON(elements, appState, files, 'database')
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
          `excalidraw-${fileId}.${inferImageExtension(file.mimeType)}`,
          adminAccessToken
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

    const buildPayload = useCallback(async (): Promise<AdminArticleFormPayload> => {
      let scene = latestSceneRef.current
      const excalidrawModule = excalidrawModuleRef.current
      const sanitizedTitle = sanitizeText(formState.title)
      const sanitizedSummary = sanitizeText(formState.summary)
      const trimmedCoverImageUrl = formState.coverImageUrl.trim()
      const trimmedUrl = slugify(formState.url)

      if (!sanitizedTitle) {
        throw new Error('标题不能为空。')
      }

      if (!trimmedUrl) {
        throw new Error('Slug 不能为空。')
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
            'database'
          )
          console.info(DEBUG_PREFIX, 'payload scene refreshed from api', {
            elements: liveElements.length,
            files: Object.keys(liveFiles).length,
          })
        }
      }

      if (!scene) {
        throw new Error('请先在编辑器中创建或修改内容。')
      }

      const activeElements = scene.elements.filter((element) => !element.isDeleted)
      if (!activeElements.length) {
        throw new Error('当前画布为空，至少需要一个可见元素。')
      }

      setIsUploadingAssets(true)
      uploadAbortRef.current = false

      const uploadedScene = await uploadSceneAssets(scene.files)
      const nextDraftJson = excalidrawModule.serializeAsJSON(
        scene.elements,
        scene.appState,
        uploadedScene.files,
        'database'
      )

      if (nextDraftJson.includes('data:image') && nextDraftJson.length > MAX_INLINE_IMAGE_BYTES) {
        throw new Error('检测到仍有较大的内联图片未完成替换，请稍后重试。')
      }

      let previewImage: Blob | null = null
      try {
        previewImage = await excalidrawModule.exportToBlob({
          elements: activeElements,
          appState: {
            ...scene.appState,
            exportBackground: true,
          },
          files: uploadedScene.files,
          mimeType: 'image/png',
        })
      } catch (error) {
        console.warn(DEBUG_PREFIX, 'preview export failed, fallback without preview image', {
          raw:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : error,
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

      return {
        title: sanitizedTitle,
        url: trimmedUrl,
        summary: sanitizedSummary,
        coverImageUrl: trimmedCoverImageUrl,
        draftJson: nextDraftJson,
        previewImage: previewImage || undefined,
      }
    }, [
      formState.coverImageUrl,
      formState.summary,
      formState.title,
      formState.url,
      uploadSceneAssets,
    ])

    const handleSubmit = useCallback(
      async (action: SubmitAction) => {
        if (submitInFlightRef.current) {
          console.info(DEBUG_PREFIX, 'skip duplicated submit', { action })
          return false
        }
        if (isEditMode && !articleId) {
          setErrorMessage('文章标识无效，无法提交。')
          return false
        }

        submitInFlightRef.current = true
        setIsSubmitting(true)
        setIsUploadingAssets(false)
        setErrorMessage('')
        setSyncState('UPDATING')
        setStatusMessage(action === 'publish' ? '正在发布文章...' : '正在保存草稿...')
        console.info(DEBUG_PREFIX, 'submit start', { action, isEditMode, articleId })

        try {
          if (!adminAccessToken) {
            throw new Error('当前登录态缺少管理员访问令牌，请重新登录后再试。')
          }
          const payload = await buildPayload()

          if (isEditMode && articleId) {
            await updateAdminArticle(articleId, payload, action, adminAccessToken)
          } else {
            await createAdminArticle(payload, action, adminAccessToken)
          }

          setDraftJson(payload.draftJson)
          pendingDraftJsonRef.current = payload.draftJson
          setIsSceneDirty(false)
          setSyncState('SUCCESS')
          setStatusMessage(action === 'publish' ? '文章已提交发布。' : '草稿已保存。')
          if (onSubmitSuccess) {
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
          setIsUploadingAssets(false)
          uploadAbortRef.current = true
        }
      },
      [adminAccessToken, articleId, buildPayload, isEditMode, onSubmitSuccess]
    )

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
        if (autoSyncTimerRef.current) {
          clearInterval(autoSyncTimerRef.current)
        }
        if (idleSyncTimerRef.current) {
          clearTimeout(idleSyncTimerRef.current)
        }
      }
    }, [])

    return (
      <div className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="relative overflow-hidden rounded-[2rem] border border-gray-200/90 bg-white/95 p-6 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.4)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/85">
            <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_58%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_42%)]" />
            <div className="relative space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex rounded-full border border-sky-200/80 bg-sky-50/90 px-4 py-1 text-[11px] font-semibold tracking-[0.28em] text-sky-700 uppercase dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                    Editor Control
                  </span>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${statusBadgeClass}`}
                  >
                    <StatusDot tone={syncState} />
                    {syncState}
                  </span>
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-gray-50">
                    {isEditMode ? '编辑既有文章' : '创建新文章'}
                  </h2>
                  <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                    保留现有后台设计语言，强化卡片层级、焦点状态和异步反馈，使编辑过程更稳定也更有掌控感。
                  </p>
                </div>
              </div>

              <div className="grid gap-4 rounded-[1.75rem] border border-white/80 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-gray-800 dark:bg-gray-950/60">
                <label className="group block space-y-2.5">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    标题
                  </span>
                  <input
                    value={formState.title}
                    maxLength={120}
                    onChange={(event) => updateField('title', event.target.value)}
                    placeholder="输入文章标题"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-900 shadow-sm transition duration-200 ease-out outline-none placeholder:text-gray-400 hover:border-sky-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-sky-500/50 dark:focus:border-sky-400 dark:focus:ring-sky-500/10"
                  />
                  <FieldHint>标题会用于列表展示与默认 slug 生成。</FieldHint>
                </label>

                <label className="group block space-y-2.5">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Slug
                  </span>
                  <input
                    value={formState.url}
                    maxLength={120}
                    onChange={(event) => updateField('url', slugify(event.target.value))}
                    placeholder="例如：sealpi-excalidraw-notes"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-900 shadow-sm transition duration-200 ease-out outline-none placeholder:text-gray-400 hover:border-sky-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-sky-500/50 dark:focus:border-sky-400 dark:focus:ring-sky-500/10"
                  />
                  <FieldHint>仅保留小写字母、数字和连字符，避免 URL 污染。</FieldHint>
                </label>

                <label className="group block space-y-2.5">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    摘要
                  </span>
                  <textarea
                    value={formState.summary}
                    maxLength={220}
                    onChange={(event) => updateField('summary', event.target.value)}
                    rows={4}
                    placeholder="用于文章列表与 SEO 的简述"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm leading-7 text-gray-900 shadow-sm transition duration-200 ease-out outline-none placeholder:text-gray-400 hover:border-sky-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-sky-500/50 dark:focus:border-sky-400 dark:focus:ring-sky-500/10"
                  />
                  <FieldHint>建议控制在 80-140 字，兼顾卡片摘要与元信息展示。</FieldHint>
                </label>

                <label className="group block space-y-2.5">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    封面图 URL
                  </span>
                  <input
                    value={formState.coverImageUrl}
                    onChange={(event) => updateField('coverImageUrl', event.target.value)}
                    placeholder="可选；为空时使用自动导出的预览图"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm text-gray-900 shadow-sm transition duration-200 ease-out outline-none placeholder:text-gray-400 hover:border-sky-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-sky-500/50 dark:focus:border-sky-400 dark:focus:ring-sky-500/10"
                  />
                  <FieldHint>如已上传 OSS，可直接覆写自动生成的预览图地址。</FieldHint>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[1.75rem] border border-gray-200/80 bg-gray-50/90 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                    <StatusDot tone={syncState} />
                    当前状态
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-200">
                    {syncState}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-gray-500 dark:text-gray-400">
                    {statusMessage}
                  </p>
                  {errorMessage ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                      {errorMessage}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[1.75rem] border border-gray-200/80 bg-white/90 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                  <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                    内容指标
                  </p>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">draftJson 大小</dt>
                      <dd className="mt-1 text-lg font-bold text-gray-950 dark:text-gray-50">
                        {draftJson ? `${Math.round(draftJson.length / 1024) || 1} KB` : '未生成'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">文章模式</dt>
                      <dd className="mt-1 text-lg font-bold text-gray-950 dark:text-gray-50">
                        {isEditMode ? '编辑' : '新建'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">图片上传</dt>
                      <dd className="mt-1 text-lg font-bold text-gray-950 dark:text-gray-50">
                        {isUploadingAssets ? '处理中' : '待命'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit('draft')}
                  className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.55)] ring-4 ring-transparent transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-gray-800 focus:ring-gray-200 focus:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200 dark:focus:ring-gray-700"
                >
                  {isSubmitting ? '提交中...' : '保存草稿'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit('publish')}
                  className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-linear-to-r from-sky-50 to-cyan-50 px-5 py-3.5 text-sm font-semibold text-sky-700 shadow-[0_18px_38px_-24px_rgba(14,165,233,0.45)] ring-4 ring-transparent transition duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-500 hover:from-sky-100 hover:to-cyan-100 focus:ring-sky-100 focus:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 dark:border-sky-500/40 dark:bg-linear-to-r dark:from-sky-500/10 dark:to-cyan-500/10 dark:text-sky-200 dark:hover:from-sky-500/20 dark:hover:to-cyan-500/20 dark:focus:ring-sky-500/10"
                >
                  {isSubmitting ? '提交中...' : '直接发布'}
                </button>
              </div>
            </div>
          </aside>

          <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)] dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex flex-col gap-4 border-b border-gray-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.88))] px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.55),rgba(17,24,39,0.78))]">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                  Excalidraw Canvas
                </p>
                <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
                  支持直接绘制、序列化为数据库 JSON，并在提交时导出预览图。
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-950/80 dark:text-gray-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Canvas Ready
              </div>
            </div>
            <div className="h-[72vh] min-h-[680px] bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.94))] dark:bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_36%),linear-gradient(180deg,rgba(2,6,23,0.6),rgba(15,23,42,0.65))]">
              <Excalidraw
                initialData={initialData}
                excalidrawAPI={(api) => {
                  excalidrawApiRef.current = api
                }}
                onChange={handleSceneChange}
                viewModeEnabled={false}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
)

export default AdminEditorClient
