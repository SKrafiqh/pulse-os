"use client";

import { memo, useMemo, ReactNode } from "react";
import { motion } from "framer-motion";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  percent: number;
  icon: ReactNode;
  accentColor?: "sky" | "teal" | "amber" | "rose";
}

function MetricCardComponent({
  title,
  value,
  unit = "%",
  subtitle,
  percent,
  icon,
  accentColor = "sky",
}: MetricCardProps) {
  const barGradient = useMemo(() => {
    if (percent >= 85) return "from-rose-500 to-red-600";
    if (percent >= 70) return "from-amber-400 to-amber-500";
    if (accentColor === "teal") return "from-teal-400 to-teal-600";
    return "from-sky-400 to-sky-600";
  }, [percent, accentColor]);

  const clampedPercent = useMemo(
    () => Math.min(Math.max(percent, 0), 100),
    [percent]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="double-bezel-outer"
    >
      <div className="double-bezel-inner p-6 flex flex-col justify-between space-y-4">
        {/* Header: Title & Icon */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700">
            {icon}
          </div>
        </div>

        {/* Value Readout */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-mono-data">
              {value}
            </span>
            <span className="text-base font-semibold text-slate-500">{unit}</span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>
          )}
        </div>

        {/* Progress Bar Gauge */}
        <div className="space-y-1.5 pt-1">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${clampedPercent}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono-data text-slate-400">
            <span>0%</span>
            <span>Capacity: {percent.toFixed(1)}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const MetricCard = memo(MetricCardComponent);
export default MetricCard;
