import { auth, signIn } from '@/auth'
import Link from '@/components/Link'
import { redirect } from 'next/navigation'

function errorText(code?: string) {
  if (code === 'banned') return '该账号已被封禁，无法登录。'
  if (code === 'sync') return '用户资料同步失败，请稍后重试或联系管理员。'
  if (code === 'AccessDenied' || code === 'Configuration') return '登录被拒绝或登录配置有误。'
  return null
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
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden p-6 sm:p-10">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(166,88,43,0.10),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(201,181,151,0.12),transparent_38%),linear-gradient(160deg,#f5ece1_0%,#fbf5ec_50%,#f5ece1_100%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(166,88,43,0.15),transparent_36%),radial-gradient(circle_at_80%_80%,rgba(166,88,43,0.10),transparent_34%),linear-gradient(160deg,#020617_0%,#0b1120_50%,#020617_100%)]" />
      <div className="border-wb-rule-soft/80 bg-wb-canvas/90 w-full max-w-lg rounded-[2rem] border p-8 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
        <h1 className="font-fraunces text-wb-ink text-2xl font-medium tracking-tight italic dark:text-white">
          登录
        </h1>
        <p className="text-wb-meta mt-3 text-sm leading-relaxed dark:text-gray-300">
          使用 GitHub 账号登录。
        </p>
        {err ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
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
              className="inline-flex w-full items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
            >
              使用 GitHub 继续
            </button>
          </form>
          <Link
            href="/"
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回首页
          </Link>
        </div>
      </div>
    </section>
  )
}
