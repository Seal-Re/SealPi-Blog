import projectsData from '@/data/projectsData'
import Card from '@/components/Card'
import { genPageMetadata } from 'app/seo'
import siteMetadata from '@/data/siteMetadata'

export const metadata = genPageMetadata({ title: '项目' })

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: siteMetadata.title, item: siteMetadata.siteUrl },
    { '@type': 'ListItem', position: 2, name: '项目', item: `${siteMetadata.siteUrl}/projects` },
  ],
}

export default function Projects() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <div className="wb-page-enter divide-wb-rule-soft divide-y">
        <div className="pt-8 pb-10 md:pt-12">
          <p className="font-inter text-wb-accent mb-3 text-[11px] font-semibold tracking-[0.26em] uppercase">
            开源 · 实验
          </p>
          <h1 className="font-fraunces text-wb-ink text-3xl font-medium tracking-tight italic sm:text-4xl md:text-6xl">
            项目
          </h1>
          <p className="text-wb-meta mt-4 max-w-md text-base leading-7">
            一些有趣的项目与实验性想法。
          </p>
        </div>
        <div data-reveal className="py-12">
          <div className="-m-4 flex flex-wrap">
            {projectsData.map((d) => (
              <Card
                key={d.title}
                title={d.title}
                description={d.description}
                imgSrc={d.imgSrc}
                href={d.href}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
