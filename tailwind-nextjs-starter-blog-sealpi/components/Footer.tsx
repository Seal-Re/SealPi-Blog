import Link from './Link'
import siteMetadata from '@/data/siteMetadata'
import SocialIcon from '@/components/social-icons'
import AdminEasterEgg from '@/components/footer/AdminEasterEgg'

const NAV_LINKS = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '文章' },
  { href: '/tags', label: '标签' },
  { href: '/archive', label: '归档' },
  { href: '/projects', label: '项目' },
  { href: '/about', label: '关于' },
]

export default function Footer() {
  return (
    <footer className="border-wb-rule-soft border-t">
      <div className="py-10">
        {/* Top row: site identity + nav */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Link
              href="/"
              className="font-fraunces hover:text-wb-accent text-wb-ink text-xl font-medium italic transition-colors"
            >
              {siteMetadata.headerTitle}
            </Link>
            <p className="text-wb-meta max-w-xs text-sm leading-6">{siteMetadata.description}</p>
          </div>
          <nav aria-label="页脚导航" className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-wb-meta hover:text-wb-accent focus-visible:ring-wb-accent rounded text-sm transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="border-wb-rule-soft my-7 border-t" />

        {/* Bottom row: social icons + copyright */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3.5">
            <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} size={5} />
            <SocialIcon kind="github" href={siteMetadata.github} size={5} />
            <SocialIcon kind="twitter" href={siteMetadata.twitter} size={5} />
            <SocialIcon kind="x" href={siteMetadata.x} size={5} />
            <SocialIcon kind="bluesky" href={siteMetadata.bluesky} size={5} />
            <SocialIcon kind="linkedin" href={siteMetadata.linkedin} size={5} />
            <SocialIcon kind="youtube" href={siteMetadata.youtube} size={5} />
            <SocialIcon kind="instagram" href={siteMetadata.instagram} size={5} />
            <SocialIcon kind="medium" href={siteMetadata.medium} size={5} />
            <Link
              href="/feed.xml"
              title="RSS 订阅"
              className="text-wb-meta hover:text-wb-accent focus-visible:ring-wb-accent rounded transition focus-visible:ring-1 focus-visible:outline-none"
            >
              <span className="sr-only">RSS 订阅</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-5 w-5 fill-current"
                aria-hidden="true"
              >
                <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19.01 7.38 20 6.18 20C4.98 20 4 19.01 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
              </svg>
            </Link>
          </div>
          <div className="text-wb-meta flex items-center gap-1.5 text-sm">
            <AdminEasterEgg>
              <span>{siteMetadata.author}</span>
            </AdminEasterEgg>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
            <span>·</span>
            <Link href="/" className="hover:text-wb-accent transition-colors duration-200">
              {siteMetadata.title}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
