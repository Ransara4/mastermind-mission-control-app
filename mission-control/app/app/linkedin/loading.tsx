export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-dark-panel2 rounded-xl" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-dark-panel2 rounded" />
            <div className="h-4 w-64 bg-dark-panel2 rounded" />
          </div>
        </div>
      </div>
      {/* Content grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6 h-48" />
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6 h-48" />
      </div>
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 h-56" />
    </div>
  )
}
