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
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.12),transparent_38%),linear-gradient(160deg,#f8fafc_0%,#eef2ff_50%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_36%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.14),transparent_34%),linear-gradient(160deg,#020617_0%,#0b1120_50%,#020617_100%)]" />
      <div className="w-full max-w-lg rounded-[2rem] border border-gray-200/80 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
        <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">登录</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
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
            className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            返回首页
          </Link>
        </div>
      </div>
    </section>
  )
}
