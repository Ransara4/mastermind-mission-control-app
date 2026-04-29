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
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4 h-24" />
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4 h-24" />
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4 h-24" />
      </div>
      {/* Table */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="space-y-3">
          <div className="h-5 w-40 bg-dark-panel2 rounded" />
          <div className="h-px bg-dark-border" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center py-2">
              <div className="h-4 w-32 bg-dark-panel2 rounded" />
              <div className="h-4 w-24 bg-dark-panel2 rounded" />
              <div className="h-4 w-20 bg-dark-panel2 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
