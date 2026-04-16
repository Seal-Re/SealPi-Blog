import Link from '@/components/Link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="border-wb-rule-soft bg-wb-canvas w-full max-w-md rounded-[2rem] border p-10 text-center shadow-[0_12px_40px_-12px_rgba(31,26,21,0.14)]">
        <p className="font-fraunces text-wb-accent mb-2 text-7xl font-medium italic">404</p>
        <h1 className="text-wb-ink mt-4 text-2xl font-bold tracking-tight">找不到这个页面。</h1>
        <p className="text-wb-meta mt-3 text-sm leading-7">别担心，可以从首页重新出发。</p>
        <Link
          href="/"
          className="bg-wb-ink text-wb-paper hover:bg-wb-ink-soft mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition"
        >
          <span aria-hidden="true">←</span>
          返回首页
        </Link>
      </div>
    </div>
  )
}
