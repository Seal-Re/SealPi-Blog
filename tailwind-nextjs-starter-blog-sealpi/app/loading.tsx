export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className="bg-wb-rule-soft/50 relative h-1 overflow-hidden dark:bg-gray-800">
        <div className="animate-loading-bar bg-wb-accent absolute inset-y-0 w-1/3 rounded-full" />
      </div>
    </div>
  )
}
