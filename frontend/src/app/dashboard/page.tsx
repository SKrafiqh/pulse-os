"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase, Machine, Metric } from "@/lib/supabase";
import MachineCard from "@/components/MachineCard";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import {
  MagnifyingGlass,
  Funnel,
  Desktop,
  Pulse,
  Cpu,
  HardDrive,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<Record<string, Metric>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Deletion modal state
  const [deletingMachine, setDeletingMachine] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Route protection guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Toast message auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Fetch initial machines and latest metrics in parallel
  const fetchMachinesAndMetrics = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const { data: machinesData, error: machinesError } = await supabase
        .from("machines")
        .select("*")
        .order("created_at", { ascending: false });

      let loadedMachines: Machine[] = [];
      if (machinesError) {
        console.warn("Supabase direct fetch failed, fallback to backend API:", machinesError);
        const res = await fetch("http://localhost:8000/api/v1/machines");
        if (res.ok) {
          const apiData = await res.json();
          loadedMachines = apiData.machines || [];
        }
      } else if (machinesData) {
        loadedMachines = machinesData;
      }

      setMachines(loadedMachines);

      if (loadedMachines.length > 0) {
        const metricPromises = loadedMachines.map(async (m) => {
          const { data: mData } = await supabase
            .from("metrics")
            .select("*")
            .eq("machine_id", m.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (mData && mData.length > 0) {
            return { machineId: m.id, metric: mData[0] as Metric };
          }

          try {
            const apiRes = await fetch(`http://localhost:8000/api/v1/machines/${m.id}/metrics?limit=1`);
            if (apiRes.ok) {
              const apiJson = await apiRes.json();
              if (apiJson.metrics && apiJson.metrics.length > 0) {
                return { machineId: m.id, metric: apiJson.metrics[0] as Metric };
              }
            }
          } catch (e) {
            // Ignore offline fallback error
          }
          return null;
        });

        const results = await Promise.all(metricPromises);
        const metricsMap: Record<string, Metric> = {};
        results.forEach((res) => {
          if (res) metricsMap[res.machineId] = res.metric;
        });

        setLatestMetrics((prev) => ({ ...prev, ...metricsMap }));
      }
    } catch (err) {
      console.error("Error loading dashboard telemetry:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMachinesAndMetrics();

      const channel = supabase
        .channel("telemetry-dashboard-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "machines" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setMachines((prev) => [payload.new as Machine, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setMachines((prev) =>
                prev.map((m) => (m.id === payload.new.id ? (payload.new as Machine) : m))
              );
            } else if (payload.eventType === "DELETE") {
              setMachines((prev) => prev.filter((m) => m.id !== payload.old.id));
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "metrics" },
          (payload) => {
            const newMetric = payload.new as Metric;
            setLatestMetrics((prev) => ({
              ...prev,
              [newMetric.machine_id]: newMetric,
            }));
          }
        )
        .subscribe();

      const pollInterval = setInterval(() => {
        fetchMachinesAndMetrics();
      }, 10000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [user, fetchMachinesAndMetrics]);

  const handleDeleteRequest = useCallback((machineId: string, machineName: string) => {
    setDeletingMachine({ id: machineId, name: machineName });
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingMachine) return;
    setIsDeleting(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/v1/machines/${deletingMachine.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Fallback to direct Supabase deletion
        const { error: sbErr } = await supabase
          .from("machines")
          .delete()
          .eq("id", deletingMachine.id);

        if (sbErr) {
          throw new Error(sbErr.message);
        }
      }

      setMachines((prev) => prev.filter((m) => m.id !== deletingMachine.id));
      setToastMessage({
        type: "success",
        text: `Machine "${deletingMachine.name}" was successfully deleted.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete machine node.";
      setToastMessage({ type: "error", text: message });
    } finally {
      setIsDeleting(false);
      setDeletingMachine(null);
    }
  };

  const filteredMachines = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return machines.filter((machine) => {
      const matchesSearch =
        !term ||
        machine.name.toLowerCase().includes(term) ||
        machine.hostname.toLowerCase().includes(term) ||
        machine.machine_key.toLowerCase().includes(term);

      if (statusFilter === "online") return matchesSearch && machine.is_online;
      if (statusFilter === "offline") return matchesSearch && !machine.is_online;
      return matchesSearch;
    });
  }, [machines, searchTerm, statusFilter]);

  const totalNodes = useMemo(() => machines.length, [machines]);
  const onlineNodes = useMemo(
    () => machines.filter((m) => m.is_online).length,
    [machines]
  );

  const { avgCpu, avgRam } = useMemo(() => {
    const metricsValues = Object.values(latestMetrics);
    if (metricsValues.length === 0) return { avgCpu: 0, avgRam: 0 };

    const cpuSum = metricsValues.reduce((acc, curr) => acc + curr.cpu_percent, 0);
    const ramSum = metricsValues.reduce((acc, curr) => acc + curr.ram_percent, 0);

    return {
      avgCpu: Math.round(cpuSum / metricsValues.length),
      avgRam: Math.round(ramSum / metricsValues.length),
    };
  }, [latestMetrics]);

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-xl"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="double-bezel-outer">
              <div className="double-bezel-inner p-4 h-20 bg-slate-100/50"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8 relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 p-4 rounded-2xl border shadow-xl flex items-center gap-3 text-xs font-semibold animate-slide-in-right ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle size={20} className="text-emerald-600 shrink-0" />
          ) : (
            <WarningCircle size={20} className="text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingMachine)}
        machineName={deletingMachine?.name || ""}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingMachine(null)}
      />

      {/* Top Banner / Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-200/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/70 text-sky-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <Pulse size={14} className="text-sky-600 animate-pulse" />
            Infrastructure Fleet
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Registered Telemetry Nodes
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl font-medium">
            Monitor real-time system metrics, CPU/RAM telemetry, and active processes across registered host agents.
          </p>
        </div>

        <button
          onClick={fetchMachinesAndMetrics}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-2xs hover:bg-slate-50 active:scale-95 transition-all self-start md:self-auto cursor-pointer"
        >
          <ArrowsClockwise
            size={16}
            className={`text-slate-500 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* Summary KPI Bento Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="double-bezel-outer">
          <div className="double-bezel-inner p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
              <Desktop size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400">Total Nodes</p>
              <p className="text-2xl font-extrabold text-slate-900 font-mono-data">{totalNodes}</p>
            </div>
          </div>
        </div>

        <div className="double-bezel-outer">
          <div className="double-bezel-inner p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400">Online Fleet</p>
              <p className="text-2xl font-extrabold text-emerald-600 font-mono-data">{onlineNodes}</p>
            </div>
          </div>
        </div>

        <div className="double-bezel-outer">
          <div className="double-bezel-inner p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <Cpu size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400">Avg CPU Load</p>
              <p className="text-2xl font-extrabold text-slate-900 font-mono-data">{avgCpu}%</p>
            </div>
          </div>
        </div>

        <div className="double-bezel-outer">
          <div className="double-bezel-inner p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <HardDrive size={20} weight="duotone" />
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold text-slate-400">Avg Memory</p>
              <p className="text-2xl font-extrabold text-slate-900 font-mono-data">{avgRam}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by machine name, hostname, or secret key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono-data"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "all"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            All ({machines.length})
          </button>
          <button
            onClick={() => setStatusFilter("online")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "online"
                ? "bg-white text-emerald-700 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Online ({onlineNodes})
          </button>
          <button
            onClick={() => setStatusFilter("offline")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "offline"
                ? "bg-white text-slate-700 shadow-2xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Offline ({machines.length - onlineNodes})
          </button>
        </div>
      </div>

      {/* Machine Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="double-bezel-outer animate-pulse">
              <div className="double-bezel-inner p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-slate-200 rounded-2xl"></div>
                  <div className="w-16 h-5 bg-slate-200 rounded-full"></div>
                </div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-16 bg-slate-100 rounded-xl"></div>
                <div className="h-6 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="double-bezel-outer text-center py-16">
          <div className="double-bezel-inner p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Funnel size={28} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">No telemetry nodes found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm
                ? "No machines matched your search query. Try clearing filters."
                : "No registered machines found in database yet. Run the host collector agent to register nodes."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMachines.map((machine) => (
            <MachineCard
              key={machine.id}
              machine={machine}
              latestMetric={latestMetrics[machine.id]}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}
