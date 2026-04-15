export const metadata = { title: '运维' }

export default function OpsPage() {
  return (
    <section className="space-y-4">
      <div className="border-wb-rule-soft bg-wb-canvas rounded-[2rem] border p-8 dark:border-gray-800 dark:bg-gray-950">
        <p className="text-wb-accent text-xs tracking-[0.24em] uppercase dark:text-gray-400">运维</p>
        <h1 className="text-wb-ink mt-2 text-2xl font-black tracking-tight dark:text-gray-50">
          运维控制台
        </h1>
        <p className="text-wb-meta mt-4 text-sm dark:text-gray-400">
          站点健康检查、日志查看、MinIO / MySQL 管理入口将在此汇总。当前为占位页，逐步接入中。
        </p>
      </div>
    </section>
  )
}
