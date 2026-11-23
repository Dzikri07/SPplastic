import React from 'react';
import type { RealtimeStatus } from '../hooks/useSupabaseRealtime';

interface RealtimeBadgeProps {
  status: RealtimeStatus;
}

export const RealtimeBadge: React.FC<RealtimeBadgeProps> = ({ status }) => {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>Realtime Aktif</span>
      </span>
    );
  }

  if (status === 'connecting') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span>Menghubungkan Realtime...</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
      <span>Realtime Terputus</span>
    </span>
  );
};
