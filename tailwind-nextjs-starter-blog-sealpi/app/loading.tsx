export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className="relative h-1 overflow-hidden bg-gray-100 dark:bg-gray-800">
        <div className="animate-loading-bar bg-primary-500 absolute inset-y-0 w-1/3 rounded-full" />
      </div>
    </div>
  )
}
