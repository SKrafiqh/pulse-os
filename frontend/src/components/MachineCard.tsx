"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Machine, Metric } from "@/lib/supabase";
import StatusBadge from "./StatusBadge";
import { Cpu, HardDrive, ArrowRight, Desktop, Trash } from "@phosphor-icons/react";

interface MachineCardProps {
  machine: Machine;
  latestMetric?: Metric;
  onDelete?: (machineId: string, machineName: string) => void;
}

function MachineCardComponent({ machine, latestMetric, onDelete }: MachineCardProps) {
  const cpuPercent = useMemo(
    () => (latestMetric ? Math.round(latestMetric.cpu_percent) : 0),
    [latestMetric?.cpu_percent]
  );
  const ramPercent = useMemo(
    () => (latestMetric ? Math.round(latestMetric.ram_percent) : 0),
    [latestMetric?.ram_percent]
  );

  const cpuColor = useMemo(() => {
    if (cpuPercent >= 85) return "bg-rose-500";
    if (cpuPercent >= 70) return "bg-amber-500";
    return "bg-sky-500";
  }, [cpuPercent]);

  const ramColor = useMemo(() => {
    if (ramPercent >= 85) return "bg-rose-500";
    if (ramPercent >= 70) return "bg-amber-500";
    return "bg-sky-500";
  }, [ramPercent]);

  const ramUsedGbStr = useMemo(
    () => (latestMetric ? latestMetric.ram_used_gb.toFixed(1) : "0"),
    [latestMetric?.ram_used_gb]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group"
    >
      <div className="double-bezel-outer">
        <div className="double-bezel-inner p-6 flex flex-col justify-between h-full space-y-5">
          {/* Top Row: Icon & Status & Delete Action */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 group-hover:bg-sky-50 group-hover:border-sky-200 group-hover:text-sky-600 transition-colors duration-200">
                <Desktop size={24} weight="duotone" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base tracking-tight group-hover:text-sky-600 transition-colors duration-200">
                  {machine.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono-data">
                  {machine.hostname}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge isOnline={machine.is_online} lastSeen={machine.last_seen} showLastSeen={false} />
              
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(machine.id, machine.name);
                  }}
                  title="Delete Machine Node"
                  className="p-1.5 rounded-xl border border-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all duration-150 cursor-pointer"
                >
                  <Trash size={16} weight="bold" />
                </button>
              )}
            </div>
          </div>

          {/* Middle Row: Quick Indicators for CPU, RAM */}
          <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
            {/* CPU Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <Cpu size={14} className="text-slate-400" />
                  CPU Load
                </span>
                <span className="font-mono-data font-semibold text-slate-900">
                  {latestMetric ? `${cpuPercent}%` : "N/A"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${cpuColor}`}
                  style={{ width: `${latestMetric ? cpuPercent : 0}%` }}
                ></div>
              </div>
            </div>

            {/* RAM Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <HardDrive size={14} className="text-slate-400" />
                  Memory
                </span>
                <span className="font-mono-data font-semibold text-slate-900">
                  {latestMetric ? `${ramPercent}% (${ramUsedGbStr} GB)` : "N/A"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${ramColor}`}
                  style={{ width: `${latestMetric ? ramPercent : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Machine Key Snippet & Detail Link Button */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 font-mono-data truncate max-w-[150px]">
              key: {machine.machine_key}
            </span>

            <Link
              href={`/machines/${machine.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-sky-600 active:scale-95 transition-all duration-200 group/btn"
            >
              <span>View Telemetry</span>
              <ArrowRight size={12} weight="bold" className="group-hover/btn:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const MachineCard = memo(MachineCardComponent);
export default MachineCard;
