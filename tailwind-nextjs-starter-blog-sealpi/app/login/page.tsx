import { auth, signIn } from '@/auth'
import Link from '@/components/Link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '登录',
  robots: { index: false, follow: false },
}

function errorText(code?: string) {
  if (!code) return null
  if (code === 'banned') return '该账号已被封禁，无法登录。'
  if (code === 'sync') return '用户资料同步失败，请稍后重试或联系管理员。'
  if (code === 'AccessDenied' || code === 'Configuration') return '登录被拒绝或登录配置有误。'
  return 'GitHub 登录过程出错，请重试。'
}

export default async function LoginPage(props: {
  searchParams?: Promise<{ next?: string; error?: string }>
}) {
  const session = await auth()
  const sp = await props.searchParams
  const nextRaw = sp?.next
  const safeNext = nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/'

  if (session?.user) {
    redirect(safeNext)
  }

  const err = errorText(sp?.error)

  return (
    <section className="wb-page-enter relative flex min-h-[70vh] items-center justify-center overflow-hidden p-6 sm:p-10">
      <div className="login-bg absolute inset-0 -z-20" />
      <div className="border-wb-rule-soft/80 bg-wb-canvas/90 w-full max-w-lg rounded-[2rem] border p-8 shadow-[0_16px_48px_-12px_rgba(31,26,21,0.22)] backdrop-blur dark:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)]">
        <h1 className="font-fraunces text-wb-ink text-2xl font-medium tracking-tight italic">
          登录
        </h1>
        <p className="text-wb-meta mt-3 text-sm leading-relaxed">使用 GitHub 账号登录。</p>
        {err ? (
          <p className="mt-4 rounded-lg border border-rose-200/70 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            {err}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <form
            action={async () => {
              'use server'
              await signIn('github', { redirectTo: safeNext })
            }}
          >
            <button
              type="submit"
              className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              使用 GitHub 继续
            </button>
          </form>
          <Link
            href="/"
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95"
          >
            返回首页
          </Link>
        </div>
      </div>
    </section>
  )
}
