import { auth } from '@/auth'
import Link from '@/components/Link'
import { adminServerGet } from '@/app/api/admin/_utils'
import type { AdminUser, PageResult } from '@/lib/blog-api-types'
import UserPermissionsActions from '@/components/admin/UserPermissionsActions'
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
  return (
    <span className="border-wb-rule-soft inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.18em] uppercase dark:border-gray-700">
      <span
        className={`h-2 w-2 rounded-full ${isAllowed ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'}`}
      />
      {isAllowed ? '可评论' : '只读'}
    </span>
  )
}

function BannedBadge({ banned }: { banned?: boolean }) {
  if (!banned) return null
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-rose-700 uppercase dark:bg-rose-950/40 dark:text-rose-300">
      <span className="h-2 w-2 rounded-full bg-rose-500" />
      已封禁
    </span>
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
      <td className="text-wb-meta px-4 py-5 text-xs dark:text-gray-300">
        <div>ID: {user.userId}</div>
        <div className="mt-1">GitHub: {user.githubId}</div>
      </td>
      <td className="text-wb-meta px-4 py-5 text-xs dark:text-gray-300">
        <div>注册: {formatDateLabel(user.createdAt)}</div>
        <div className="mt-1">登录: {formatDateLabel(user.lastLoginAt)}</div>
      </td>
    </tr>
  )
}

async function fetchUsers(pageIndex: number) {
  const params = new URLSearchParams({
    pageIndex: String(pageIndex),
    pageSize: '20',
  })
  return adminServerGet<PageResult<AdminUser>>(`/api/v1/admin/users?${params.toString()}`)
}

function buildPageHref(pageIndex: number) {
  return `/admin/users?pageIndex=${Math.max(pageIndex, 1)}`
}

export default async function AdminUsersPage(props: {
  searchParams?: Promise<{ pageIndex?: string }>
}) {
  await auth()
  const searchParams = await props.searchParams
  const pageIndex = Math.max(Number(searchParams?.pageIndex || '1') || 1, 1)
  let users: AdminUser[] = []
  let pageSize = 20
  let totalCount = 0
  let totalPages = 1
  let loadError = ''

  const response = await fetchUsers(pageIndex)
  if (response === null) {
    loadError = '读取用户列表失败，请检查登录态后重试。'
  } else {
    users = response?.data || []
    pageSize = response?.pageSize || 20
    totalCount = response?.totalCount || 0
    totalPages = Math.max(Math.ceil(totalCount / pageSize), 1)
  }

  return (
    <section className="space-y-8">
      <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-5 rounded-[2rem] border p-8 lg:flex-row lg:items-end lg:justify-between dark:border-gray-800 dark:bg-gray-950">
        <div className="space-y-3">
          <span className="border-wb-rule bg-wb-paper text-wb-accent inline-flex rounded-full border px-4 py-1 text-xs font-semibold tracking-[0.24em] uppercase dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            用户管理
          </span>
          <h1 className="text-wb-ink text-3xl font-black tracking-tight sm:text-4xl dark:text-white">
            用户列表
          </h1>
          <p className="text-wb-meta max-w-3xl text-sm leading-7 dark:text-gray-300">
            通过 GitHub OAuth 登录的注册用户列表。
          </p>
        </div>
        <Link
          href="/admin"
          className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper inline-flex items-center justify-center self-start rounded-full border px-5 py-3 text-sm font-semibold transition lg:self-auto dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
        >
          返回后台首页
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            注册用户总数
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black dark:text-gray-50">{totalCount}</p>
        </div>
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            当前页码
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black dark:text-gray-50">{pageIndex}</p>
        </div>
        <div className="border-wb-rule-soft bg-wb-canvas rounded-3xl border p-5 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-wb-meta text-xs font-semibold tracking-[0.24em] uppercase dark:text-gray-400">
            总页数
          </p>
          <p className="text-wb-ink mt-3 text-3xl font-black dark:text-gray-50">{totalPages}</p>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100">
          <p className="font-semibold">用户列表接口调用失败</p>
          <p className="mt-1">{loadError}</p>
        </div>
      ) : null}

      <div className="border-wb-rule-soft bg-wb-canvas overflow-hidden rounded-[2rem] border dark:border-gray-800 dark:bg-gray-950">
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
                  <td
                    colSpan={5}
                    className="text-wb-meta px-4 py-14 text-center text-sm leading-7 dark:text-gray-400"
                  >
                    暂无注册用户数据。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-wb-rule-soft bg-wb-canvas flex flex-col gap-3 rounded-[2rem] border p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950">
        <p className="text-wb-meta text-sm leading-7 dark:text-gray-200">
          共 {totalCount} 位 · 第 {pageIndex} / {totalPages} 页
        </p>
        <div className="flex gap-3">
          <Link
            href={buildPageHref(pageIndex - 1)}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              pageIndex <= 1
                ? 'border-wb-rule-soft bg-wb-paper text-wb-meta pointer-events-none border dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                : 'border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper border dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950'
            }`}
          >
            上一页
          </Link>
          <Link
            href={buildPageHref(Math.min(pageIndex + 1, totalPages))}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              pageIndex >= totalPages
                ? 'border-wb-rule-soft bg-wb-paper text-wb-meta pointer-events-none border dark:border-gray-800 dark:bg-gray-900 dark:text-gray-600'
                : 'border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper border dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950'
            }`}
          >
            下一页
          </Link>
        </div>
      </div>
    </section>
  )
}
