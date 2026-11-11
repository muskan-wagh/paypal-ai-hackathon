/** Loading skeletons used by route-level loading.tsx files. */

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-surface rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div className="skeleton h-2.5 w-24 rounded-full" />
            <div className="skeleton h-8 w-8 rounded-lg" />
          </div>
          <div className="skeleton mt-3 h-7 w-20 rounded-lg" />
          <div className="skeleton mt-2 h-2.5 w-32 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card-surface rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="skeleton h-3.5 w-56 rounded-full" />
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
          <div className="skeleton mt-3 h-2.5 w-40 rounded-full" />
          <div className="skeleton mt-4 h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card-surface rounded-2xl p-5">
      <div className="skeleton h-3 w-32 rounded-full" />
      <div className="mt-4 space-y-3.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-2.5 w-3/4 rounded-full" />
              <div className="skeleton h-2 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="space-y-6">
      {title ? (
        <div className="space-y-2">
          <div className="skeleton h-3 w-28 rounded-full" />
          <div className="skeleton h-8 w-72 rounded-lg" />
          <div className="skeleton h-2.5 w-96 max-w-full rounded-full" />
        </div>
      ) : null}
      <StatGridSkeleton />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <ListSkeleton rows={3} />
        <PanelSkeleton />
      </div>
    </div>
  );
}
