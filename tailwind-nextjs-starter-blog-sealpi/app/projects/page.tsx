import projectsData from '@/data/projectsData'
import Card from '@/components/Card'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: '项目' })

export default function Projects() {
  return (
    <>
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
        <div className="py-12">
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
