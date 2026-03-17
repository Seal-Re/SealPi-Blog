import { auth, signIn } from '@/auth'
import Link from '@/components/Link'

function LoginActionCard() {
  return (
    <div className="rounded-[2rem] border border-gray-200 bg-white/90 p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/85">
      <div className="space-y-4">
        <span className="inline-flex rounded-full border border-amber-300/80 bg-amber-50 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-amber-700 uppercase dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200">
          Admin Access
        </span>
        <h1 className="text-4xl font-black tracking-tight text-gray-950 sm:text-5xl dark:text-white">
          使用 GitHub 登录后台
        </h1>
        <p className="max-w-2xl text-base leading-8 text-gray-600 sm:text-lg dark:text-gray-300">
          当前后台通过 GitHub OAuth 登录，只有命中管理员白名单的账号才允许进入管理域。登录后前端会从
          session 中读取 access token，用于后续请求 Java 管理接口。
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <form
          action={async () => {
            'use server'
            await signIn('github', { redirectTo: '/admin' })
          }}
        >
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            以 GitHub 身份继续
          </button>
        </form>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
        >
          返回前台首页
        </Link>
      </div>
    </div>
  )
}

function UnauthorizedState() {
  return (
    <div className="rounded-[2rem] border border-rose-200 bg-rose-50/90 p-8 shadow-[0_20px_70px_-42px_rgba(225,29,72,0.4)] dark:border-rose-900/50 dark:bg-rose-950/30">
      <h2 className="text-2xl font-black tracking-tight text-rose-950 dark:text-rose-100">
        当前账号未被授予后台权限
      </h2>
      <p className="mt-4 text-sm leading-7 text-rose-900/80 dark:text-rose-100/80">
        如果 GitHub 登录成功但仍无法进入后台，通常表示该账号未包含在 `ADMIN_GITHUB_IDS` 白名单内。
        该限制来自现有鉴权设计，用于保护 `/admin` 与 `/api/v1/admin/**`。
      </p>
    </div>
  )
}

export default async function AdminLoginPage(props: {
  searchParams?: Promise<{ error?: string }>
}) {
  const session = await auth()
  const searchParams = await props.searchParams
  const isDenied = searchParams?.error === 'AccessDenied'

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.22),transparent_35%),linear-gradient(180deg,#fffdf6_0%,#ffffff_48%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.14),transparent_33%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <LoginActionCard />
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-gray-200 bg-white/85 p-7 shadow-[0_20px_70px_-40px_rgba(15,23,42,0.25)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/75">
            <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
              已具备的后台基础
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-gray-700 dark:text-gray-200">
              <li>GitHub OAuth 登录与管理员白名单校验已经接通。</li>
              <li>中间件已保护 `/admin/:path*`，未登录会跳转到当前页面。</li>
              <li>登录成功后会把 `accessToken` 写入 session，供后端 Bearer Token 调用使用。</li>
            </ul>
          </div>

          {isDenied ? <UnauthorizedState /> : null}

          {session?.user?.isAdmin ? (
            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/90 p-7 shadow-[0_20px_70px_-42px_rgba(16,185,129,0.35)] dark:border-emerald-900/50 dark:bg-emerald-950/30">
              <h2 className="text-2xl font-black tracking-tight text-emerald-950 dark:text-emerald-100">
                当前会话已通过管理员校验
              </h2>
              <p className="mt-4 text-sm leading-7 text-emerald-900/80 dark:text-emerald-100/80">
                你已经拥有后台权限，可直接进入管理台主页面继续后续配置与内容管理。
              </p>
              <div className="mt-6">
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 dark:bg-emerald-400 dark:text-gray-950 dark:hover:bg-emerald-300"
                >
                  进入管理台
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
