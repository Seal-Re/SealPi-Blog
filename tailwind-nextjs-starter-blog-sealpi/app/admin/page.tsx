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
      className="group rounded-[2rem] border border-gray-200 bg-white p-5 shadow-gray-200/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-950"
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
    <div className="group rounded-3xl border border-gray-200 bg-white p-6 shadow-gray-200/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-950">
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
    <section className="space-y-8">
      <div className="space-y-10">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex rounded-full border border-gray-200 bg-white px-4 py-1 text-xs font-semibold tracking-[0.28em] text-gray-700 uppercase dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
            Admin Console
          </span>
          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tight text-gray-950 sm:text-5xl dark:text-white">
              管理后台
            </h1>
            <p className="max-w-2xl text-base leading-8 text-gray-600 sm:text-lg dark:text-gray-300">
              通过 GitHub 登录与管理员校验后，可进行文章创建、草稿保存、发布与删除。
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            label="管理员状态"
            value={user?.isAdmin ? '已授权' : '未授权'}
            hint="来自 GitHub user id 白名单校验结果。"
          />
          <StatCard
            label="GitHub 用户 ID"
            value={user?.githubUserId || '未获取'}
            hint="用于识别管理员身份的 GitHub 用户编号。"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-white uppercase dark:bg-white dark:text-gray-950">
                当前登录信息
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
            </dl>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <AdminQuickAction
                href="/admin/articles"
                title="文章列表"
                description="查看后端文章分页数据，进入编辑、校对与发布流程。"
              />
              <AdminQuickAction
                href="/admin/editor"
                title="新建文章"
                description="直接进入编辑入口，使用 Excalidraw 进行创作、保存草稿与发布。"
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-950">
            <div className="space-y-4">
              <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
                常用入口
              </h2>
              <p className="text-sm leading-7 text-gray-700 dark:text-gray-200">
                使用下方入口快速返回前台或结束当前管理员会话。
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-900 transition-all duration-300 hover:border-gray-900 hover:bg-gray-900 hover:text-white active:scale-95 dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
              >
                返回前台首页
              </Link>
              <form
                action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/login?next=/admin' })
                }}
              >
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-gray-800 active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
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
