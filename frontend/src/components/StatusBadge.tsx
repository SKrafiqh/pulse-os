"use client";

import { useMemo, useState, useEffect } from "react";
import { formatRelativeTime } from "@/lib/supabase";

interface StatusBadgeProps {
  isOnline: boolean;
  lastSeen?: string;
  showLastSeen?: boolean;
}

export default function StatusBadge({ isOnline, lastSeen, showLastSeen = true }: StatusBadgeProps) {
  const [now, setNow] = useState(Date.now());

  // Periodically refresh current time to update relative status & 45s threshold
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const computedIsOnline = useMemo(() => {
    if (!lastSeen) return isOnline;
    const diffSeconds = (now - new Date(lastSeen).getTime()) / 1000;
    return diffSeconds <= 45;
  }, [isOnline, lastSeen, now]);

  return (
    <div className="flex items-center gap-2">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${
          computedIsOnline
            ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
            : "bg-slate-100 text-slate-600 border-slate-200"
        }`}
      >
        <span className="relative flex h-2 w-2">
          {computedIsOnline && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              computedIsOnline ? "bg-emerald-500" : "bg-slate-400"
            }`}
          ></span>
        </span>
        <span>{computedIsOnline ? "Online" : "Offline"}</span>
      </div>

      {showLastSeen && lastSeen && (
        <span className="text-[11px] text-slate-400 font-mono-data">
          {computedIsOnline ? "Active now" : `Seen ${formatRelativeTime(lastSeen)}`}
        </span>
      )}
    </div>
  );
}
