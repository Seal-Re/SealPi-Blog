import Link from 'next/link'
import { slug } from 'github-slugger'
interface Props {
  text: string
}

const Tag = ({ text }: Props) => {
  return (
    <Link
      href={`/tags/${slug(text)}`}
      className="text-wb-accent hover:text-wb-ink mr-3 text-sm font-medium uppercase transition-colors duration-200"
    >
      {text.split(' ').join('-')}
    </Link>
  )
}

export default Tag
