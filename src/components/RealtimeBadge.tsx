import React from 'react';
import type { RealtimeStatus } from '../hooks/useSupabaseRealtime';

interface RealtimeBadgeProps {
  status: RealtimeStatus;
}

export const RealtimeBadge: React.FC<RealtimeBadgeProps> = ({ status }) => {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="motion-safe:animate-ping motion-reduce:hidden absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-medium text-ink">Realtime aktif</span>
      </span>
    );
  }

  if (status === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <span className="h-2 w-2 rounded-full bg-amber-500 motion-safe:animate-pulse shrink-0" />
        <span>Menghubungkan realtime…</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
      <span>Realtime terputus</span>
    </span>
  );
};

