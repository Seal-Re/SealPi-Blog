interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: 'SealPi Blog',
    description:
      '本博客系统本身。Spring Boot 3.2 + Next.js 15 全栈，Excalidraw 作为内容格式，支持草稿/发布工作流与 MinIO 图片托管。',
    href: 'https://github.com/Seal-Re/SealPi-Blog',
  },
]

export default projectsData
