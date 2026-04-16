import Link from 'next/link'
import { slug } from 'github-slugger'
interface Props {
  text: string
}

const Tag = ({ text }: Props) => {
  return (
    <Link
      href={`/tags/${slug(text)}`}
      className="border-wb-rule-soft text-wb-meta font-geist-mono hover:border-wb-accent hover:text-wb-accent rounded border px-2 py-0.5 text-[11px] transition-colors duration-200"
    >
      #{text.split(' ').join('-')}
    </Link>
  )
}

export default Tag
