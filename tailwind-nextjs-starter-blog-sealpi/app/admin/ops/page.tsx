export const metadata = { title: '运维' }

export default function OpsPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-[2rem] border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-950">
        <p className="text-xs tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
          运维
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-gray-50">
          运维控制台
        </h1>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          站点健康检查、日志查看、MinIO / MySQL 管理入口将在此汇总。当前为占位页，逐步接入中。
        </p>
      </div>
    </section>
  )
}
