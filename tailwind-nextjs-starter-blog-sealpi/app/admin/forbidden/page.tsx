import Link from '@/components/Link'

export default function AdminForbiddenPage() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 sm:p-10">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_22%,rgba(225,29,72,0.18),transparent_38%),radial-gradient(circle_at_82%_78%,rgba(244,63,94,0.14),transparent_36%),linear-gradient(160deg,#fff1f2_0%,#ffe4e6_45%,#fff1f2_100%)] dark:bg-[radial-gradient(circle_at_18%_22%,rgba(225,29,72,0.2),transparent_36%),radial-gradient(circle_at_82%_78%,rgba(244,63,94,0.16),transparent_34%),linear-gradient(160deg,#0f172a_0%,#111827_45%,#0f172a_100%)]" />
      <div className="bg-wb-canvas/35 absolute inset-0 -z-10 backdrop-blur-2xl dark:bg-black/35" />
      <div className="bg-wb-canvas/85 w-full max-w-2xl rounded-[2rem] border border-rose-200/70 p-8 shadow-[0_24px_80px_-42px_rgba(225,29,72,0.35)] backdrop-blur-xl dark:border-rose-900/50 dark:bg-gray-950/65">
        <span className="inline-flex rounded-full border border-rose-300/70 bg-rose-100 px-4 py-1 text-xs font-semibold tracking-[0.2em] text-rose-700 uppercase dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-200">
          Access Denied
        </span>
        <h1 className="text-wb-ink mt-5 text-3xl font-black tracking-tight sm:text-4xl dark:text-white">
          当前 GitHub 账号未被授予后台权限
        </h1>
        <p className="text-wb-meta mt-4 text-base leading-8 dark:text-gray-300">
          该站点后台仅对管理员白名单开放。你可以切换账号重试，或联系维护者将你的 GitHub ID
          加入配置。
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login?next=/admin"
            className="inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
          >
            返回登录页
          </Link>
          <Link
            href="/"
            className="border-wb-rule text-wb-ink hover:border-wb-ink hover:bg-wb-ink hover:text-wb-paper inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-100 dark:hover:bg-gray-100 dark:hover:text-gray-950"
          >
            回到首页
          </Link>
        </div>
      </div>
    </section>
  )
}
