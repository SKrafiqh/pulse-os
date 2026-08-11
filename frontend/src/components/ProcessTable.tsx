"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { ProcessItem } from "@/lib/supabase";
import { MagnifyingGlass, Lightning, ListChecks } from "@phosphor-icons/react";

interface ProcessTableProps {
  processes: ProcessItem[];
}

function ProcessTableComponent({ processes }: ProcessTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    []
  );

  const filteredProcesses = useMemo(() => {
    if (!searchTerm.trim()) return processes;
    const term = searchTerm.toLowerCase();
    return processes.filter(
      (proc) =>
        proc.name.toLowerCase().includes(term) ||
        proc.pid.toString().includes(term)
    );
  }, [processes, searchTerm]);

  return (
    <div className="double-bezel-outer">
      <div className="double-bezel-inner p-6 space-y-4">
        {/* Table Header & Search Input */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <ListChecks size={20} weight="bold" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                Active System Processes
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Top {processes.length} resource-consuming tasks
              </p>
            </div>
          </div>

          {/* Search Pill */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search process name or PID..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono-data"
            />
          </div>
        </div>

        {/* Process Table Grid */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/60 text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                <th className="py-3 px-4">PID</th>
                <th className="py-3 px-4">Process Name</th>
                <th className="py-3 px-4">CPU Usage</th>
                <th className="py-3 px-4">Memory Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono-data text-slate-700">
              {filteredProcesses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No matching active processes found.
                  </td>
                </tr>
              ) : (
                filteredProcesses.map((proc) => {
                  const isHighCpu = proc.cpu_percent >= 10.0;
                  const isHighMem = proc.memory_percent >= 10.0;

                  return (
                    <tr
                      key={proc.pid}
                      className="hover:bg-slate-50/60 transition-colors duration-150"
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-400">
                        #{proc.pid}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-900 flex items-center gap-2">
                        {proc.name}
                        {isHighCpu && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Lightning size={10} weight="fill" /> CPU
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-semibold ${
                            isHighCpu ? "text-amber-600" : "text-slate-800"
                          }`}
                        >
                          {proc.cpu_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-semibold ${
                            isHighMem ? "text-teal-600" : "text-slate-800"
                          }`}
                        >
                          {proc.memory_percent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const ProcessTable = memo(ProcessTableComponent);
export default ProcessTable;
