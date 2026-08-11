"use client";

import { formatRelativeTime } from "@/lib/supabase";

interface StatusBadgeProps {
  isOnline: boolean;
  lastSeen?: string;
  showLastSeen?: boolean;
}

export default function StatusBadge({ isOnline, lastSeen, showLastSeen = true }: StatusBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${
          isOnline
            ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
            : "bg-slate-100 text-slate-600 border-slate-200"
        }`}
      >
        <span className="relative flex h-2 w-2">
          {isOnline && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isOnline ? "bg-emerald-500" : "bg-slate-400"
            }`}
          ></span>
        </span>
        <span>{isOnline ? "Online" : "Offline"}</span>
      </div>

      {showLastSeen && lastSeen && (
        <span className="text-[11px] text-slate-400 font-mono-data">
          {isOnline ? "Active now" : `Seen ${formatRelativeTime(lastSeen)}`}
        </span>
      )}
    </div>
  );
}
