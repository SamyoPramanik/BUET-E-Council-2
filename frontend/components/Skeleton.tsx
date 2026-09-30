// Placeholder blocks shown while a page or panel loads: grey pulsing shapes in
// the layout of the content that is coming, instead of a bare "Loading..." text.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

// Page title, a toolbar row and a list / table of rows.
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="p-4 sm:p-6 space-y-5" role="status" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" />
      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-4 w-16 hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

// A meeting page: header card, tab strip and a content panel.
export function MeetingSkeleton() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-5 mx-auto w-full max-w-7xl" role="status" aria-busy="true" aria-label="Loading">
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0" />
        ))}
      </div>
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

// Whole-screen shell (sidebar + content) for the moment before the user is known.
export function WorkspaceSkeleton() {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="hidden md:block w-64 shrink-0 border-r border-border bg-sidebar p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <PageSkeleton />
      </div>
    </div>
  );
}
