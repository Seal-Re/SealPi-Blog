export default function WbDivider() {
  return (
    <div className="text-wb-accent mb-10 flex items-center gap-4 opacity-60">
      <svg
        viewBox="0 0 56 16"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        className="block h-4 w-14"
        aria-hidden="true"
      >
        <path d="M2 8 Q 10 3 20 8 T 40 8 T 54 8" />
      </svg>
      <svg
        viewBox="0 0 12 12"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        className="block h-2.5 w-2.5 shrink-0"
        aria-hidden="true"
      >
        <polygon points="6,0 8,4 12,6 8,8 6,12 4,8 0,6 4,4" />
      </svg>
      <svg
        viewBox="0 0 56 16"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        className="block h-4 w-14"
        aria-hidden="true"
      >
        <path d="M2 8 Q 16 3 28 8 T 54 8" />
      </svg>
    </div>
  )
}
