import { auth } from '@/auth'
import Link from '@/components/Link'
import { adminServerGet } from '@/app/api/admin/_utils'
import type { AdminUser, PageResult } from '@/lib/blog-api-types'
import UserPermissionsActions from '@/components/admin/UserPermissionsActions'
import AdminUsersTopbarPortal from '@/components/admin/AdminUsersTopbarPortal'
import { getPageSequence } from '@/lib/pagination-utils'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: '用户列表',
  description: '管理后台用户列表。',
})

function formatDateLabel(value?: string) {
  if (!value) return '未记录'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function CommentBadge({ permission }: { permission?: string }) {
  const isAllowed = permission === 'ALLOWED'
  if (isAllowed) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase dark:border-emerald-500/40 dark:text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        可评论
      </span>
    )
  }
  return (
    <span className="border-wb-rule-soft text-wb-meta inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase dark:border-gray-700 dark:text-gray-400">
      <span className="bg-wb-rule h-2 w-2 rounded-full dark:bg-gray-500" />
      只读
    </span>
  )
}

function BannedBadge({ banned }: { banned?: boolean }) {
  if (!banned) return null
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-rose-700 uppercase dark:border-rose-500/40 dark:text-rose-300">
      <span className="h-2 w-2 rounded-full bg-rose-500" />
      已封禁
    </span>
  )
}

function UserCard({ user }: { user: AdminUser }) {
  return (
    <div className="border-wb-rule-soft/70 hover:bg-wb-paper/60 relative border-b px-5 py-4 transition-all duration-300 last:border-b-0 dark:border-gray-800/70 dark:hover:bg-gray-900/40">
      <div className="flex items-start gap-3">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.nickname || user.githubLogin}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="bg-wb-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold dark:bg-gray-800">
            {(user.nickname || user.githubLogin || '?')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-wb-ink text-sm leading-snug font-semibold dark:text-gray-50">
                {user.nickname || user.githubLogin}
              </p>
              <p className="text-wb-meta text-xs dark:text-gray-400">@{user.githubLogin}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <CommentBadge permission={user.commentPermission} />
              {user.banned && <BannedBadge banned={user.banned} />}
            </div>
          </div>
          {user.email ? (
            <p className="text-wb-meta text-xs dark:text-gray-400">{user.email}</p>
          ) : null}
          <div className="text-wb-meta flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums dark:text-gray-500">
            <span>ID {user.userId}</span>
            <span>GitHub {user.githubId}</span>
            <span>注册 {formatDateLabel(user.createdAt)}</span>
          </div>
          <UserPermissionsActions
            userId={user.userId}
            commentPermission={user.commentPermission}
            banned={user.banned}
          />
        </div>
      </div>
    </div>
  )
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <tr className="border-wb-rule-soft/80 hover:bg-wb-paper/70 group border-t align-top transition-all duration-300 dark:border-gray-800/80 dark:hover:bg-gray-900/40">
      <td className="px-4 py-5">
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.nickname || user.githubLogin}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="bg-wb-paper flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold dark:bg-gray-800">
              {(user.nickname || user.githubLogin || '?')[0].toUpperCase()}
            </div>
          )}
          <div className="space-y-1">
            <p className="text-wb-ink text-sm font-semibold dark:text-gray-50">
              {user.nickname || user.githubLogin}
            </p>
            <p className="text-wb-meta text-xs dark:text-gray-400">@{user.githubLogin}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-5">
        <p className="text-wb-meta text-xs dark:text-gray-400">{user.email || '未提供'}</p>
        {user.bio ? (
          <p className="text-wb-meta mt-1 max-w-xs truncate text-xs dark:text-gray-400">
            {user.bio}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-5">
        <div className="flex flex-col gap-2">
          <CommentBadge permission={user.commentPermission} />
          <BannedBadge banned={user.banned} />
          <UserPermissionsActions
            userId={user.userId}
            commentPermission={user.commentPermission}
            banned={user.banned}
          />
        </div>
      </td>
      <td className="text-wb-meta px-4 py-5 text-xs tabular-nums dark:text-gray-300">
        <div>ID: {user.userId}</div>
        <div className="mt-1">GitHub: {user.githubId}</div>
      </td>
      <td className="text-wb-meta px-4 py-5 text-xs tabular-nums dark:text-gray-300">
        <div>注册: {formatDateLabel(user.createdAt)}</div>
        <div className="mt-1">登录: {formatDateLabel(user.lastLoginAt)}</div>
      </td>
    </tr>
  )
}

async function fetchUsers(pageIndex: number, q?: string, banned?: string) {
  const params = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: '20',
  })
  if (q) params.set('q', q)
  if (banned === 'true' || banned === 'false') params.set('banned', banned)
  return adminServerGet<PageResult<AdminUser>>(`/api/v1/admin/users?${params.toString()}`)
}

function buildPageHref(pageIndex: number, q?: string, banned?: string) {
  const params = new URLSearchParams({ pageIndex: String(Math.max(pageIndex, 1)) })
  if (q) params.set('q', q)
  if (banned === 'true' || banned === 'false') params.set('banned', banned)
  return `/admin/users?${params.toString()}`
}

export default async function AdminUsersPage(props: {
  searchParams?: Promise<{ pageIndex?: string; q?: string; banned?: string }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const pageIndex = Math.max(Number(searchParams?.pageIndex || '1') || 1, 1)
  const q = searchParams?.q?.trim() || undefined
  const banned = searchParams?.banned || undefined
  let users: AdminUser[] = []
  let pageSize = 20
  let totalCount = 0
  let totalPages = 1
  let loadError = ''

  const response = await fetchUsers(pageIndex, q, banned)
  if (response === null) {
    loadError = '读取用户列表失败，请检查登录态后重试。'
  } else {
    users = response?.data || []
    pageSize = response?.pageSize || 20
    totalCount = response?.totalCount || 0
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1)
  }

  const hasFilter = Boolean(q || banned === 'true' || banned === 'false')

  return (
    <section className="wb-page-enter space-y-8">
      <AdminUsersTopbarPortal q={q} banned={banned} />

      <div className="border-wb-rule-soft bg-wb-canvas relative flex flex-col gap-5 overflow-hidden rounded-[2rem] border p-8 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-950">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.09),transparent_55%),radial-gradient(circle_at_top_right,rgba(201,181,151,0.07),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(166,88,43,0.08),transparent_55%),radial-gradient(circle_at_top_right,rgba(166,88,43,0.04),transparent_40%)]" />
        <div className="relative space-y-3">
          <span className="border-wb-rule bg-wb-paper text-wb-accent inline-flex rounded-full border px-4 py-1 text-xs font-semibold tracking-[0.24em] uppercase dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            用户管理
          </span>
          <h1 className="text-wb-ink text-3xl font-black tracking-tight sm:text-4xl dark:text-white">
            用户列表
          </h1>
          <p className="text-wb-meta max-w-3xl text-sm leading-7 dark:text-gray-300">
            通过 GitHub OAuth 登录的注册用户列表。
            {hasFilter && (
              <span className="text-wb-accent ml-2 dark:text-gray-400">
                （已筛选：
                {[
                  banned === 'true' ? '已封禁' : banned === 'false' ? '正常' : null,
                  q ? `关键词「${q}」` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                ）
                <a
                  href="/admin/users"
                  className="text-wb-meta hover:text-wb-ink ml-1 underline underline-offset-2 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  清空
                </a>
              </span>
            )}
          </p>
        </div>
        <Link
          href="/admin"
          className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper focus-visible:ring-wb-accent inline-flex items-center justify-center self-start rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 lg:self-auto dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
        >
          返回后台首页
        </Link>
      </div>

      {/* Mobile inline filter — hidden on sm+ where the topbar filter takes over */}
      <form
        action="/admin/users"
        method="get"
        className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-3 rounded-2xl border p-4 sm:hidden dark:border-gray-800 dark:bg-gray-950"
      >
        <div className="relative">
          <svg
            className="text-wb-meta/70 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 dark:text-gray-500"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            name="q"
            defaultValue={q}
            placeholder="搜索用户名 / 邮箱"
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink placeholder:text-wb-meta focus:border-wb-accent focus:ring-wb-accent/10 w-full rounded-full border py-2 pr-3 pl-8 text-sm transition-all duration-300 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex gap-2">
          <select
            name="banned"
            defaultValue={banned || 'all'}
            className="border-wb-rule-soft bg-wb-canvas text-wb-ink focus:border-wb-accent focus:ring-wb-accent/10 flex-1 rounded-full border px-3 py-2 text-sm transition-all duration-300 outline-none focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="all">全部用户</option>
            <option value="false">正常</option>
            <option value="true">已封禁</option>
          </select>
          <button
            type="submit"
            className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft focus-visible:ring-wb-accent rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            筛选
          </button>
          {hasFilter && (
            <a
              href="/admin/users"
              className="border-wb-rule text-wb-meta hover:border-wb-ink hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-400 dark:hover:text-gray-200"
            >
              清空
            </a>
          )}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            {hasFilter ? '筛选结果数' : '注册用户总数'}
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black tabular-nums dark:text-gray-50">
            {totalCount}
          </p>
        </div>
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            当前页码
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black tabular-nums dark:text-gray-50">
            {pageIndex}
          </p>
        </div>
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:border-gray-800 dark:bg-gray-950 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            总页数
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black tabular-nums dark:text-gray-50">
            {totalPages}
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
          <p className="font-semibold">用户列表接口调用失败</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : null}

      {/* Mobile card list — shown below md */}
      <div className="border-wb-rule-soft bg-wb-canvas overflow-hidden rounded-[2rem] border md:hidden dark:border-gray-800 dark:bg-gray-950">
        {users.length > 0 ? (
          users.map((user) => <UserCard key={user.userId} user={user} />)
        ) : (
          <div className="px-5 py-16 text-center">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="text-wb-rule dark:text-gray-700"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {hasFilter ? (
                  <>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </>
                ) : (
                  <>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </>
                )}
              </svg>
              <p className="text-wb-meta text-sm font-semibold dark:text-gray-400">
                {hasFilter ? '未找到符合条件的用户' : '暂无注册用户'}
              </p>
              <p className="text-wb-meta max-w-xs text-xs leading-6 dark:text-gray-500">
                {hasFilter
                  ? '尝试修改筛选条件，或清空所有筛选后重试。'
                  : '用户通过 GitHub OAuth 登录后将出现在这里。'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table — shown from md up */}
      <div className="border-wb-rule-soft bg-wb-canvas hidden overflow-hidden rounded-[2rem] border md:block dark:border-gray-800 dark:bg-gray-950">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead className="bg-wb-paper/80 dark:bg-gray-950/60">
              <tr>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  用户
                </th>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  邮箱 / 简介
                </th>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  权限
                </th>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  编号
                </th>
                <th className="text-wb-meta px-4 py-4 text-xs font-semibold tracking-[0.2em] uppercase dark:text-gray-400">
                  时间
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => <UserRow key={user.userId} user={user} />)
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="text-wb-rule dark:text-gray-700"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {hasFilter ? (
                          <>
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                          </>
                        ) : (
                          <>
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </>
                        )}
                      </svg>
                      <p className="text-wb-meta text-sm font-semibold dark:text-gray-400">
                        {hasFilter ? '未找到符合条件的用户' : '暂无注册用户'}
                      </p>
                      <p className="text-wb-meta max-w-xs text-xs leading-6 dark:text-gray-500">
                        {hasFilter
                          ? '尝试修改筛选条件，或清空所有筛选后重试。'
                          : '用户通过 GitHub OAuth 登录后将出现在这里。'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-4 rounded-[2rem] border p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950">
        <p className="text-wb-meta text-sm leading-7 tabular-nums dark:text-gray-200">
          共 {totalCount} 位 · 第 {pageIndex} / {totalPages} 页
        </p>
        {totalPages > 1 && (
          <nav className="flex flex-wrap items-center gap-1" aria-label="分页导航">
            {pageIndex > 1 ? (
              <Link
                href={buildPageHref(pageIndex - 1, q, banned)}
                rel="prev"
                aria-label="上一页"
                className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent focus-visible:ring-wb-accent inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400"
              >
                <span aria-hidden="true">←</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="border-wb-rule-soft text-wb-rule inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full border opacity-35 select-none dark:border-gray-800 dark:text-gray-600"
              >
                <span aria-hidden="true">←</span>
              </span>
            )}

            {getPageSequence(pageIndex, totalPages).map((item, idx) =>
              item === 'ellipsis' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="text-wb-rule px-1 text-sm select-none dark:text-gray-600"
                >
                  …
                </span>
              ) : item === pageIndex ? (
                <span
                  key={item}
                  aria-current="page"
                  className="bg-wb-accent text-wb-paper inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums"
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={buildPageHref(item, q, banned)}
                  aria-label={`第 ${item} 页`}
                  className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent focus-visible:ring-wb-accent inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm tabular-nums transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400"
                >
                  {item}
                </Link>
              )
            )}

            {pageIndex < totalPages ? (
              <Link
                href={buildPageHref(pageIndex + 1, q, banned)}
                rel="next"
                aria-label="下一页"
                className="border-wb-rule-soft text-wb-meta hover:border-wb-accent hover:text-wb-accent focus-visible:ring-wb-accent inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-95 dark:border-gray-700 dark:text-gray-400"
              >
                <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="border-wb-rule-soft text-wb-rule inline-flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full border opacity-35 select-none dark:border-gray-800 dark:text-gray-600"
              >
                <span aria-hidden="true">→</span>
              </span>
            )}
          </nav>
        )}
      </div>
    </section>
  )
}
