import React from 'react';

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden="true" className={`animate-pulse bg-zinc-800/70 rounded-lg ${className}`} />
);

export const RequestSkeleton: React.FC = () => (
  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3" aria-hidden="true">
    <div className="flex items-center gap-2">
      <SkeletonBlock className="w-6 h-6 rounded-full bg-zinc-800/70!" />
      <SkeletonBlock className="h-3.5 w-32" />
      <SkeletonBlock className="h-3 w-20" />
    </div>
    <SkeletonBlock className="h-3 w-2/3" />
    <SkeletonBlock className="h-3 w-1/3" />
    <div className="flex justify-end">
      <SkeletonBlock className="h-8 w-40 rounded-xl" />
    </div>
  </div>
);

export const ListRowSkeleton: React.FC = () => (
  <div className="p-3 flex items-center justify-between gap-4" aria-hidden="true">
    <div className="flex items-center gap-2 min-w-0">
      <SkeletonBlock className="h-4 w-16" />
      <SkeletonBlock className="h-3 w-48 max-w-[50vw]" />
    </div>
    <SkeletonBlock className="h-3 w-14 shrink-0" />
  </div>
);

export const TileSkeleton: React.FC<{ aspectClass?: string }> = ({ aspectClass = 'aspect-square' }) => (
  <div className={`relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 ${aspectClass}`} aria-hidden="true">
    <SkeletonBlock className="absolute inset-0 h-full w-full rounded-none! bg-zinc-800/60!" />
  </div>
);

