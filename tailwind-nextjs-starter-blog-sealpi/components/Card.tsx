import Image from './Image'
import Link from './Link'

const Card = ({ title, description, imgSrc, href }) => (
  <div className="max-w-[544px] p-4 md:w-1/2">
    <div
      className={`${imgSrc && 'h-full'} bg-wb-canvas border-wb-rule-soft group overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_-8px_rgba(31,26,21,0.22)] dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.6)]`}
    >
      {imgSrc &&
        (href ? (
          <Link
            href={href}
            aria-label={`查看 ${title}`}
            className="focus-visible:ring-wb-accent block overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
          >
            <Image
              alt={title}
              src={imgSrc}
              className="object-cover object-center transition-transform duration-300 group-hover:scale-105 md:h-36 lg:h-48"
              width={544}
              height={306}
            />
          </Link>
        ) : (
          <Image
            alt={title}
            src={imgSrc}
            className="object-cover object-center md:h-36 lg:h-48"
            width={544}
            height={306}
          />
        ))}
      <div className="p-6">
        <h2 className="font-fraunces text-wb-ink mb-3 text-2xl leading-8 font-semibold tracking-tight italic">
          {href ? (
            <Link
              href={href}
              aria-label={`查看 ${title}`}
              className="hover:text-wb-accent focus-visible:ring-wb-accent rounded transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </h2>
        <p className="text-wb-meta mb-4 text-sm leading-6">{description}</p>
        {href && (
          <Link
            href={href}
            className="group/cta text-wb-accent hover:text-wb-ink focus-visible:ring-wb-accent inline-flex items-center gap-1 rounded text-sm font-medium transition-colors duration-200 focus-visible:ring-1 focus-visible:outline-none"
            aria-label={`查看 ${title}`}
          >
            了解更多
            <span
              className="inline-block transition-transform duration-200 group-hover/cta:translate-x-0.5"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        )}
      </div>
    </div>
  </div>
)

export default Card
