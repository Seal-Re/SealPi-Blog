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
  adminFetch,
  createAdminArticle,
  type AdminArticleFormPayload,
  updateAdminArticle,
  uploadAdminAsset,
} from '@/lib/admin-api'
import type { AdminArticle, PageResult } from '@/lib/blog-api-types'

type SubmitAction = 'draft' | 'publish'
type ExcalidrawModule = typeof import('@excalidraw/excalidraw')
type SyncState = 'SUCCESS' | 'UPDATING' | 'FAILED'
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
  { ssr: false }
)

const MAX_INLINE_IMAGE_BYTES = 200 * 1024
const MAX_UPLOAD_IMAGE_BYTES = 10 * 1024 * 1024
const AUTO_SYNC_IDLE_MS = 1200
const AUTO_SAVE_TO_SERVER_MS = 4000
const DEBUG_PREFIX = '[AdminEditor]'
const CREATE_LOOKUP_PAGE_SIZE = 10

type EditorState = {
  title: string
  url: string
  summary: string
  coverImageUrl: string
  draftBodyMd: string
  coverCaption: string
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
    draftBodyMd: article?.draftBodyMd ?? '',
    coverCaption: article?.coverCaption ?? '',
  }
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-wb-meta text-xs leading-6 dark:text-gray-400">{children}</p>
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
    const contentFingerprintRef = useRef<string>('')
    const baselineReadyRef = useRef(false)
    const isSceneDirtyRef = useRef(false)
    const isSubmittingRef = useRef(false)
    const isUploadingAssetsRef = useRef(false)
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
    const [isSceneDirty, setIsSceneDirty] = useState(false)
    const [isUploadingAssets, setIsUploadingAssets] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<string>('')
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
    useEffect(() => {
      isSceneDirtyRef.current = isSceneDirty
    }, [isSceneDirty])

    useEffect(() => {
      isSubmittingRef.current = isSubmitting
    }, [isSubmitting])

    useEffect(() => {
      isUploadingAssetsRef.current = isUploadingAssets
    }, [isUploadingAssets])

    useEffect(() => {
      slugDetachedFromTitleRef.current = Boolean(article?.articleId)
    }, [article?.articleId])

    const [currentArticleId, setCurrentArticleId] = useState<number | null>(
      article?.articleId ? Number(article.articleId) : null
    )
    const isEditMode = currentArticleId !== null

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

    const syncStateLabel: Record<SyncState, string> = {
      SUCCESS: '正常',
      UPDATING: '同步中',
      FAILED: '失败',
    }

    const updateField = useCallback((key: keyof EditorState, value: string) => {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
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
        const nextDraftJson = excalidrawModule.serializeAsJSON(
          elements,
          appState,
          files,
          'database'
        )
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
              'database'
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

        return {
          title: sanitizedTitle || '未命名草稿',
          url: trimmedUrl || `draft-${Date.now()}`,
          summary: sanitizedSummary,
          coverImageUrl: trimmedCoverImageUrl,
          draftJson: nextDraftJson,
          previewImage: previewImage || undefined,
          draftBodyMd: formState.draftBodyMd || undefined,
          coverCaption: formState.coverCaption || undefined,
        }
      },
      [
        formState.coverImageUrl,
        formState.coverCaption,
        formState.draftBodyMd,
        formState.summary,
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

    const resolveCreatedArticleId = useCallback(
      async (payload: AdminArticleFormPayload, action: SubmitAction) => {
        const params = new URLSearchParams({
          pageIndex: '1',
          pageSize: String(CREATE_LOOKUP_PAGE_SIZE),
          q: payload.url,
          status: action === 'publish' ? 'published' : 'draft',
        })
        const response = await adminFetch<PageResult<AdminArticle>>(`/api/v1/articles?${params}`)
        const matched = (response?.data || []).find((item) => item.url === payload.url)
        const matchedId = matched?.articleId ? Number(matched.articleId) : NaN
        if (!Number.isFinite(matchedId) || matchedId <= 0) {
          return null
        }
        return matchedId
      },
      []
    )

    const handleSubmit = useCallback(
      async (action: SubmitAction, source: 'manual' | 'auto' = 'manual') => {
        if (submitInFlightRef.current) {
          console.info(DEBUG_PREFIX, 'skip duplicated submit', { action })
          return false
        }
        submitInFlightRef.current = true
        setIsSubmitting(true)
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
            await createAdminArticle(payload, action)
            const createdId = await resolveCreatedArticleId(payload, action)
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
          setIsSceneDirty(false)
          setSyncState('SUCCESS')
          const draftSuccessText = source === 'auto' ? '草稿已自动保存。' : '草稿已保存。'
          setStatusMessage(action === 'publish' ? '文章已提交发布。' : draftSuccessText)
          setLastSavedAt(
            new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          )
          const draftToastText = source === 'auto' ? '草稿已自动保存。' : '草稿已保存。'
          pushSnackbar(action === 'publish' ? '发布成功。' : draftToastText, 'ok')
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
        resolveCreatedArticleId,
      ]
    )

    useEffect(() => {
      if (!isSceneDirty || isSubmitting || isUploadingAssets) {
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
    }, [handleSubmit, isSceneDirty, isSubmitting, isUploadingAssets])

    useEffect(() => {
      const onSaveShortcut = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase()
        if ((event.ctrlKey || event.metaKey) && key === 's') {
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
        hasPendingChanges: () => isSceneDirtyRef.current,
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
        if (autoSyncTimer) {
          clearInterval(autoSyncTimer)
        }
        if (idleSyncTimer) {
          clearTimeout(idleSyncTimer)
        }
      }
    }, [])

    return (
      <>
        <div className="space-y-8">
          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <aside className="border-wb-rule-soft/90 bg-wb-canvas/95 relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_28px_90px_-42px_rgba(31,26,21,0.3)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/85">
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
                      {syncState}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-wb-ink text-2xl font-black tracking-tight dark:text-gray-50">
                      {isEditMode ? '编辑既有文章' : '创建新文章'}
                    </h2>
                    <p className="text-wb-meta text-sm leading-7 dark:text-gray-300">
                      保留现有后台设计语言，强化卡片层级、焦点状态和异步反馈，使编辑过程更稳定也更有掌控感。
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
                    <FieldHint>建议控制在 80-140 字，兼顾卡片摘要与元信息展示。</FieldHint>
                  </label>

                  <label className="group block space-y-2.5">
                    <span className="text-wb-ink text-sm font-semibold dark:text-gray-200">
                      封面图 URL
                    </span>
                    <input
                      value={formState.coverImageUrl}
                      onChange={(event) => updateField('coverImageUrl', event.target.value)}
                      placeholder="可选；为空时使用自动导出的预览图"
                      className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta hover:border-wb-rule focus:border-wb-accent focus:ring-wb-accent/10 dark:focus:border-wb-accent/70 w-full rounded-2xl border px-4 py-3.5 text-sm shadow-sm transition duration-200 ease-out outline-none focus:ring-4 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:hover:border-gray-600"
                    />
                    <FieldHint>如已上传 OSS，可直接覆写自动生成的预览图地址。</FieldHint>
                  </label>
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
                    <p className="text-wb-meta mt-1 text-xs leading-6 dark:text-gray-400">
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
                        <dd className="text-wb-ink mt-1 text-lg font-bold dark:text-gray-50">
                          {draftJson ? `${Math.round(draftJson.length / 1024) || 1} KB` : '未生成'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-wb-meta text-xs dark:text-gray-400">文章模式</dt>
                        <dd className="text-wb-ink mt-1 text-lg font-bold dark:text-gray-50">
                          {isEditMode ? '编辑' : '新建'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-wb-meta text-xs dark:text-gray-400">图片上传</dt>
                        <dd className="text-wb-ink mt-1 text-lg font-bold dark:text-gray-50">
                          {isUploadingAssets ? '处理中' : '待命'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-wb-meta text-xs dark:text-gray-400">快捷键</dt>
                        <dd className="text-wb-ink mt-1 text-lg font-bold dark:text-gray-50">
                          Ctrl/Cmd + S
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                  <button
                    type="button"
                    disabled={isSubmitting || isUploadingAssets}
                    onClick={() => void handleSubmit('draft')}
                    className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.55)] ring-4 ring-transparent transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-gray-800 focus:ring-gray-200 focus:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200 dark:focus:ring-gray-700"
                  >
                    {isSubmitting ? '提交中...' : '保存草稿'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || isUploadingAssets}
                    onClick={() => void handleSubmit('publish')}
                    className="border-wb-rule text-wb-accent hover:border-wb-accent hover:text-wb-accent focus:ring-wb-accent/10 dark:border-wb-accent/40 dark:text-wb-accent/80 inline-flex items-center justify-center rounded-full border bg-[linear-gradient(135deg,rgba(251,245,236,0.95),rgba(245,236,225,0.90))] px-5 py-3.5 text-sm font-semibold shadow-[0_18px_38px_-24px_rgba(166,88,43,0.30)] ring-4 ring-transparent transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,rgba(245,236,225,0.98),rgba(237,223,207,0.95))] focus:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-[linear-gradient(135deg,rgba(166,88,43,0.10),rgba(166,88,43,0.06))] dark:hover:bg-[linear-gradient(135deg,rgba(166,88,43,0.20),rgba(166,88,43,0.14))]"
                  >
                    {isSubmitting ? '提交中...' : '直接发布'}
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
                      className="border-wb-rule text-wb-meta hover:border-wb-rule hover:text-wb-ink inline-flex items-center justify-center gap-1.5 rounded-full border px-5 py-3.5 text-sm font-medium transition duration-200 ease-out hover:-translate-y-0.5 dark:border-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                    >
                      预览草稿 ↗
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
              <div className="border-wb-rule-soft bg-wb-canvas mt-4 space-y-3 rounded-xl border p-4 dark:border-gray-800 dark:bg-gray-950">
                <label className="block">
                  <span className="text-wb-meta text-xs font-semibold tracking-[0.2em] uppercase">
                    画布注释（Caveat 手写体显示）
                  </span>
                  <input
                    type="text"
                    value={formState.coverCaption}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, coverCaption: e.target.value }))
                    }
                    maxLength={200}
                    placeholder="例：DDD 分层一张图就够了"
                    className="border-wb-rule mt-1 w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
                <label className="block">
                  <span className="text-wb-meta text-xs font-semibold tracking-[0.2em] uppercase">
                    Markdown 正文
                  </span>
                  <textarea
                    value={formState.draftBodyMd}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, draftBodyMd: e.target.value }))
                    }
                    placeholder={'# 正文\n\n支持 Markdown，:::note 块会渲染为手写批注。'}
                    className="border-wb-rule mt-1 min-h-[200px] w-full resize-y rounded border px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
        {snackbar.show ? (
          <div
            className={`fixed right-4 bottom-4 z-[85] rounded-xl border px-4 py-3 text-sm shadow-lg ${
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
