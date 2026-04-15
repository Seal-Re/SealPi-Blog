import siteMetadata from '@/data/siteMetadata'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: '关于' })

export default function Page() {
  return (
    <section className="space-y-6 pt-6 pb-8">
      <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl dark:text-gray-50">
        关于
      </h1>
      <p className="max-w-3xl text-base leading-8 text-gray-700 dark:text-gray-200">
        这里是 {siteMetadata.title}。本站内容已收口为后端动态文章源，正文采用 Excalidraw JSON 渲染，
        后台提供草稿、发布、上传与封面预览图导出能力。
      </p>
    </section>
  )
}
