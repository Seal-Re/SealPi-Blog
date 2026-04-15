import siteMetadata from '@/data/siteMetadata'
import Link from '@/components/Link'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: '关于' })

export default function Page() {
  return (
    <section className="space-y-10 pt-6 pb-8">
      <div className="space-y-4">
        <h1 className="font-fraunces text-wb-ink text-3xl font-medium tracking-tight italic sm:text-4xl">
          关于
        </h1>
        <p className="text-wb-meta max-w-2xl text-base leading-8">{siteMetadata.description}</p>
      </div>

      <div className="border-wb-rule-soft bg-wb-canvas grid gap-6 rounded-2xl border p-6 sm:grid-cols-2 sm:p-8">
        <div className="space-y-2">
          <p className="font-inter text-wb-accent text-[11px] font-semibold tracking-[0.2em] uppercase">
            作者
          </p>
          <p className="text-wb-ink text-xl font-bold">{siteMetadata.author}</p>
          <Link
            href={siteMetadata.github || '#'}
            className="text-wb-meta hover:text-wb-accent font-inter inline-flex items-center gap-1.5 text-sm transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </Link>
        </div>

        <div className="space-y-2">
          <p className="font-inter text-wb-accent text-[11px] font-semibold tracking-[0.2em] uppercase">
            本站
          </p>
          <p className="text-wb-ink text-xl font-bold">{siteMetadata.title}</p>
          <Link
            href={siteMetadata.siteRepo || '#'}
            className="text-wb-meta hover:text-wb-accent font-inter inline-flex items-center gap-1.5 text-sm transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            源码仓库
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-fraunces text-wb-ink text-xl font-semibold italic">平台特性</h2>
        <ul className="text-wb-meta space-y-2 text-sm leading-7">
          <li>· Excalidraw JSON 作为文章内容格式，支持手绘图表渲染</li>
          <li>
            · Markdown 正文，支持代码高亮、表格、脚注与手写批注（
            <code className="text-wb-accent">:::note</code> 指令）
          </li>
          <li>· Spring Boot 3.2 + Next.js 15 全栈，Draft/Publish 工作流</li>
          <li>· MinIO 图片托管，Excalidraw 内联图片自动上传外置</li>
          <li>· 动态 RSS / Sitemap，搜索由 kbar 驱动</li>
        </ul>
      </div>
    </section>
  )
}
