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
      {/* Session list */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="space-y-4">
          <div className="h-5 w-32 bg-dark-panel2 rounded" />
          <div className="h-px bg-dark-border" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 py-2">
              <div className="w-10 h-10 bg-dark-panel2 rounded-lg shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-52 bg-dark-panel2 rounded" />
                <div className="h-3 w-72 bg-dark-panel2 rounded" />
              </div>
              <div className="h-4 w-20 bg-dark-panel2 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 h-48" />
    </div>
  )
}
