import { auth, signOut } from '@/auth'
import Link from '@/components/Link'
import { adminServerGet } from '@/app/api/admin/_utils'
import { isArchivedStatus, isPublishedStatus } from '@/lib/article-status'
import type { AdminArticle, ArticleStats, PageResult } from '@/lib/blog-api-types'

function AdminQuickAction({
  href,
  title,
  description,
  icon,
}: {
  href: string
  title: string
  description: string
  icon?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="border-wb-rule-soft bg-wb-canvas focus-visible:ring-wb-accent group rounded-[2rem] border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]"
    >
      {icon ? (
        <div className="text-wb-accent mb-3 opacity-70 dark:text-gray-500">{icon}</div>
      ) : null}
      <h3 className="text-wb-ink group-hover:text-wb-accent text-base font-bold tracking-tight transition-colors dark:text-white dark:group-hover:text-gray-200">
        {title}
      </h3>
      <p className="text-wb-meta mt-2 text-sm leading-6 dark:text-gray-300">{description}</p>
    </Link>
  )
}

type StatCardProps = {
  label: string
  value: string
  hint: string
  icon?: React.ReactNode
}

function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <div className="border-wb-rule-soft bg-wb-canvas group rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
      <div className="flex items-start justify-between">
        <p className="text-wb-accent text-xs font-semibold tracking-[0.28em] uppercase dark:text-gray-400">
          {label}
        </p>
        {icon ? (
          <span className="text-wb-meta mt-0.5 opacity-60 dark:text-gray-600">{icon}</span>
        ) : null}
      </div>
      <p className="text-wb-ink mt-3 text-lg font-semibold break-all tabular-nums dark:text-gray-50">
        {value}
      </p>
      <p className="text-wb-meta mt-2 text-sm leading-6 dark:text-gray-300">{hint}</p>
    </div>
  )
}

export default async function AdminPage() {
  const session = await auth()
  const user = session?.user

  const [stats, recentResult] = await Promise.all([
    adminServerGet<ArticleStats>('/api/v1/admin/stats'),
    adminServerGet<PageResult<AdminArticle>>(
      '/api/v1/admin/articles?pageIndex=1&pageSize=5&sort=lastmod'
    ),
  ])

  const totalArticles = stats?.total ?? null
  const publishedCount = stats?.published ?? null
  const draftCount = stats?.draft ?? null
  const archivedCount = stats?.archived ?? null
  const totalViews = stats?.totalViews ?? null
  const recentArticles = recentResult?.data ?? []

  return (
    <section className="wb-page-enter space-y-8">
      <div className="space-y-10">
        <div className="border-wb-rule-soft bg-wb-canvas relative overflow-hidden rounded-[2rem] border p-8 dark:border-gray-800 dark:bg-gray-950">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.09),transparent_55%),radial-gradient(circle_at_top_right,rgba(201,181,151,0.07),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.08),transparent_55%),radial-gradient(circle_at_top_right,rgba(166,88,43,0.04),transparent_40%)]" />
          <div className="relative max-w-3xl space-y-4">
            <span className="border-wb-rule bg-wb-paper text-wb-accent inline-flex rounded-full border px-4 py-1 text-xs font-semibold tracking-[0.28em] uppercase dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200">
              管理控制台
            </span>
            <div className="space-y-4">
              <h1 className="text-wb-ink text-4xl font-black tracking-tight sm:text-5xl dark:text-white">
                管理后台
              </h1>
              <p className="text-wb-meta max-w-2xl text-base leading-8 sm:text-lg dark:text-gray-300">
                通过 GitHub 登录与管理员校验后，可进行文章创建、草稿保存、发布与删除。
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              {
                label: '文章总数',
                value: totalArticles,
                hint: '所有状态的文章总数量。',
                href: '/admin/articles',
                iconColor: 'text-wb-meta dark:text-gray-500',
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                ),
              },
              {
                label: '已发布',
                value: publishedCount,
                hint: '当前处于发布状态的文章数。',
                href: '/admin/articles?status=published',
                iconColor: 'text-emerald-500 dark:text-emerald-400',
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ),
              },
              {
                label: '草稿中',
                value: draftCount,
                hint: '当前保存为草稿的文章数量。',
                href: '/admin/drafts',
                iconColor: 'text-wb-accent dark:text-wb-accent',
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                ),
              },
              {
                label: '已归档',
                value: archivedCount,
                hint: '已归档（软删除）的文章数量。',
                href: '/admin/articles?status=archived',
                iconColor: 'text-amber-500 dark:text-amber-400',
                icon: (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                ),
              },
            ] as {
              label: string
              value: number | null
              hint: string
              href: string
              iconColor: string
              icon: React.ReactNode
            }[]
          ).map(({ label, value, hint, href, iconColor, icon }) => (
            <Link
              key={label}
              href={href}
              className="border-wb-rule-soft bg-wb-canvas focus-visible:ring-wb-accent group rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-start justify-between">
                <p className="text-wb-accent text-xs font-semibold tracking-[0.28em] uppercase dark:text-gray-400">
                  {label}
                </p>
                <span className={`${iconColor} opacity-70`}>{icon}</span>
              </div>
              <p className="text-wb-ink mt-3 text-3xl font-black tabular-nums dark:text-gray-50">
                {value !== null ? value : '—'}
              </p>
              <p className="text-wb-meta mt-2 text-sm leading-6 dark:text-gray-300">{hint}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="管理员状态"
            value={user?.isAdmin ? '已授权' : '未授权'}
            hint="来自 GitHub user id 白名单校验结果。"
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
          <StatCard
            label="GitHub 用户 ID"
            value={user?.githubUserId || '未获取'}
            hint="用于识别管理员身份的 GitHub 用户编号。"
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
          <StatCard
            label="累计浏览量"
            value={totalViews !== null ? totalViews.toLocaleString('zh-CN') : '—'}
            hint="所有文章的总阅读次数。"
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
        </div>

        {recentArticles.length > 0 && (
          <div className="border-wb-rule-soft bg-wb-canvas rounded-[2rem] border p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between">
              <h2 className="text-wb-ink text-base font-black tracking-tight dark:text-white">
                最近修改
              </h2>
              <Link
                href="/admin/articles"
                className="group/all text-wb-meta hover:text-wb-accent focus-visible:ring-wb-accent inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs transition-colors focus-visible:ring-1 focus-visible:outline-none active:scale-95 dark:text-gray-400 dark:hover:text-gray-100"
              >
                查看全部
                <span
                  className="inline-block transition-transform duration-200 group-hover/all:translate-x-0.5"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </div>
            <ul className="mt-4 divide-y divide-[var(--color-wb-rule-soft)] dark:divide-gray-800">
              {recentArticles.map((article) => (
                <li
                  key={article.articleId}
                  className="hover:bg-wb-accent/5 -mx-3 flex items-start gap-3 rounded-xl px-3 py-3 transition-colors duration-150 dark:hover:bg-white/5"
                >
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      isArchivedStatus(article.draft)
                        ? 'bg-amber-500'
                        : isPublishedStatus(article.draft)
                          ? 'bg-emerald-500'
                          : 'bg-wb-rule dark:bg-gray-600'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/editor?articleId=${article.articleId}`}
                      className="text-wb-ink hover:text-wb-accent focus-visible:ring-wb-accent block truncate rounded text-sm font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none dark:text-gray-50 dark:hover:text-gray-300"
                    >
                      {article.title || '未命名草稿'}
                    </Link>
                    <p className="text-wb-meta mt-0.5 text-xs tabular-nums dark:text-gray-500">
                      {article.lastmod
                        ? new Intl.DateTimeFormat('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          }).format(new Date(article.lastmod))
                        : '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="border-wb-rule-soft bg-wb-canvas rounded-[2rem] border p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-wb-ink text-wb-paper dark:bg-wb-paper dark:text-wb-ink rounded-full px-3 py-1 text-xs font-semibold tracking-[0.24em] uppercase">
                当前登录信息
              </span>
            </div>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="border-wb-rule-soft bg-wb-paper rounded-2xl border p-4 dark:border-gray-800 dark:bg-gray-950/70">
                <dt className="text-wb-meta text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-500">
                  GitHub 昵称
                </dt>
                <dd className="text-wb-ink mt-2 text-base font-semibold dark:text-gray-50">
                  {user?.name || '未提供'}
                </dd>
              </div>
              <div className="border-wb-rule-soft bg-wb-paper rounded-2xl border p-4 dark:border-gray-800 dark:bg-gray-950/70">
                <dt className="text-wb-meta text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-500">
                  邮箱
                </dt>
                <dd className="text-wb-ink mt-2 text-base font-semibold break-all dark:text-gray-50">
                  {user?.email || '未提供'}
                </dd>
              </div>
            </dl>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AdminQuickAction
                href="/admin/articles"
                title="文章列表"
                description="查看后端文章分页数据，进入编辑、校对与发布流程。"
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                }
              />
              <AdminQuickAction
                href="/admin/editor?mode=new"
                title="新建文章"
                description="直接进入编辑入口，使用 Excalidraw 进行创作、保存草稿与发布。"
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                }
              />
              <AdminQuickAction
                href="/admin/drafts"
                title="草稿箱"
                description="查看所有已保存的草稿，选择继续编辑或发布。"
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                }
              />
              <AdminQuickAction
                href="/admin/users"
                title="用户列表"
                description="查看通过 GitHub OAuth 登录的注册用户及其权限状态。"
                icon={
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                }
              />
            </div>
          </div>

          <div className="border-wb-rule-soft bg-wb-canvas rounded-[2rem] border p-6 sm:p-8 dark:border-gray-800 dark:bg-gray-950">
            <div className="space-y-4">
              <h2 className="text-wb-ink text-2xl font-black tracking-tight dark:text-white">
                常用入口
              </h2>
              <p className="text-wb-meta text-sm leading-7 dark:text-gray-200">
                使用下方入口快速返回前台或结束当前管理员会话。
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/"
                className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
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
                  className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
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
