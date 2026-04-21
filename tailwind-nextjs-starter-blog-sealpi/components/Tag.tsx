import Link from 'next/link'
import { slug } from 'github-slugger'
interface Props {
  text: string
}

const Tag = ({ text }: Props) => {
  return (
    <Link
      href={`/tags/${slug(text) || text}`}
      className="border-wb-rule-soft text-wb-meta font-geist-mono hover:border-wb-accent hover:bg-wb-accent/5 hover:text-wb-accent focus-visible:ring-wb-accent rounded border px-2 py-0.5 text-[11px] transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none active:scale-95"
    >
      #{text}
    </Link>
  )
}

export default Tag
