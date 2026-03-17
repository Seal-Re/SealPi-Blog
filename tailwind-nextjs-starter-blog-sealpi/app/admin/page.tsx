import { auth, signOut } from '@/auth'
import Link from '@/components/Link'

function AdminQuickAction({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.75rem] border border-gray-200 bg-white p-5 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.28)] transition hover:-translate-y-1 hover:border-gray-900 hover:shadow-[0_28px_90px_-38px_rgba(15,23,42,0.42)] dark:border-gray-800 dark:bg-gray-900/80 dark:hover:border-gray-200"
    >
      <p className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
        Admin Action
      </p>
      <h3 className="mt-3 text-xl font-black tracking-tight text-gray-950 group-hover:text-gray-700 dark:text-white dark:group-hover:text-gray-200">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">{description}</p>
    </Link>
  )
}

type StatCardProps = {
  label: string
  value: string
  hint: string
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-gray-200/80 bg-white p-5 shadow-[0_18px_60px_-32px_rgba(15,23,42,0.35)] dark:border-gray-800 dark:bg-gray-900/80">
      <p className="text-xs font-semibold tracking-[0.28em] text-gray-500 uppercase dark:text-gray-400">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold break-all text-gray-950 dark:text-gray-50">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{hint}</p>
    </div>
  )
}

export default async function AdminPage() {
  const session = await auth()
  const user = session?.user

  return (
    <section className="relative overflow-hidden py-14 sm:py-20">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_55%),radial-gradient(circle_at_right,rgba(251,191,36,0.14),transparent_35%)]" />
      <div className="space-y-10">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold tracking-[0.28em] text-sky-700 uppercase dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            Admin Console
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight text-gray-950 sm:text-5xl dark:text-white">
              后台主入口已具备可执行主链路
            </h1>
            <p className="max-w-2xl text-base leading-8 text-gray-600 sm:text-lg dark:text-gray-300">
              当前已打通 GitHub 登录、管理员白名单校验与 Bearer Token 管理接口调用基础设施。
              下一步可以在这里继续接文章列表、编辑器、文件上传和发布动作。
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="管理员状态"
            value={user?.isAdmin ? '已授权' : '未授权'}
            hint="来自 GitHub user id 白名单校验结果。"
          />
          <StatCard
            label="GitHub 用户 ID"
            value={user?.githubUserId || '未获取'}
            hint="后续透传 Bearer Token 给管理后端时会继续使用这个身份。"
          />
          <StatCard
            label="Access Token"
            value={session?.accessToken ? '已写入 session' : '暂不可用'}
            hint="当前已经可以由服务端管理 API Client 自动透传。"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.45)] sm:p-8 dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-white uppercase dark:bg-white dark:text-gray-950">
                Session Snapshot
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                当前页面由服务端 session 读取。
              </span>
            </div>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/70">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  GitHub 昵称
                </dt>
                <dd className="mt-2 text-base font-semibold text-gray-950 dark:text-gray-50">
                  {user?.name || '未提供'}
                </dd>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-950/70">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">邮箱</dt>
                <dd className="mt-2 text-base font-semibold break-all text-gray-950 dark:text-gray-50">
                  {user?.email || '未提供'}
                </dd>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4 sm:col-span-2 dark:bg-gray-950/70">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">当前主计划</dt>
                <dd className="mt-2 text-base leading-7 text-gray-700 dark:text-gray-200">
                  先完成文章列表与新建入口，再接 Excalidraw 编辑器、草稿保存、发布与前台动态详情页。
                </dd>
              </div>
            </dl>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <AdminQuickAction
                href="/admin/articles"
                title="文章列表"
                description="查看后端文章分页数据，进入后续编辑与发布流程。"
              />
              <AdminQuickAction
                href="/admin/editor"
                title="新建文章"
                description="直接进入编辑入口，后续在此接入 Excalidraw 创作与保存能力。"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-linear-to-br from-amber-50 via-white to-sky-50 p-6 shadow-[0_18px_60px_-32px_rgba(245,158,11,0.45)] sm:p-8 dark:border-gray-800 dark:from-amber-950/20 dark:via-gray-900 dark:to-sky-950/30">
            <div className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
                管理台基础能力已成型
              </h2>
              <p className="text-sm leading-7 text-gray-700 dark:text-gray-200">
                登录页、导航入口和服务端 Bearer Token
                请求封装已经就位，当前后台可以继续向文章管理闭环推进。
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:border-gray-900 hover:bg-gray-900 hover:text-white dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
              >
                返回前台首页
              </Link>
              <form
                action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/admin/login' })
                }}
              >
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
                >
                  退出当前管理员会话
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
