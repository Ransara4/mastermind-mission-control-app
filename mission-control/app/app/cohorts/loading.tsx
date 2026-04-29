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
      {/* Participant list */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="space-y-4">
          <div className="h-5 w-36 bg-dark-panel2 rounded" />
          <div className="h-px bg-dark-border" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-1">
              <div className="w-9 h-9 bg-dark-panel2 rounded-full shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="h-4 w-40 bg-dark-panel2 rounded" />
                <div className="h-3 w-56 bg-dark-panel2 rounded" />
              </div>
              <div className="h-6 w-16 bg-dark-panel2 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 h-40" />
    </div>
  )
}
