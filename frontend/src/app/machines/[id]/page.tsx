"use client";

import { use, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase, Machine, Metric } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import MetricCard from "@/components/MetricCard";
import MetricChart from "@/components/MetricChart";
import ProcessTable from "@/components/ProcessTable";
import AIDiagnosticsCard from "@/components/AIDiagnosticsCard";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import {
  ArrowLeft,
  Cpu,
  HardDrive,
  Database,
  Pulse,
  Desktop,
  Key,
  Trash,
} from "@phosphor-icons/react";

interface MachineDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function MachineDetailPage({ params }: MachineDetailPageProps) {
  const resolvedParams = use(params);
  const machineId = resolvedParams.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Route protection guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch machine metadata and historical metrics in parallel
  const fetchMachineData = useCallback(async () => {
    try {
      const machinePromise = supabase
        .from("machines")
        .select("*")
        .eq("id", machineId)
        .single();

      const metricsPromise = supabase
        .from("metrics")
        .select("*")
        .eq("machine_id", machineId)
        .order("created_at", { ascending: false })
        .limit(35);

      const [machineRes, metricsRes] = await Promise.all([
        machinePromise,
        metricsPromise,
      ]);

      if (machineRes.error) {
        console.warn("Supabase machine fetch error, fallback to backend API:", machineRes.error);
        const res = await fetch("http://localhost:8000/api/v1/machines");
        if (res.ok) {
          const apiJson = await res.json();
          const found = (apiJson.machines || []).find((m: Machine) => m.id === machineId);
          if (found) setMachine(found);
        }
      } else if (machineRes.data) {
        setMachine(machineRes.data);
      }

      if (metricsRes.error) {
        console.warn("Supabase metrics fetch error, fallback to backend API:", metricsRes.error);
        const apiRes = await fetch(`http://localhost:8000/api/v1/machines/${machineId}/metrics?limit=35`);
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          setMetrics(apiJson.metrics || []);
        }
      } else if (metricsRes.data) {
        setMetrics(metricsRes.data);
      }
    } catch (err) {
      console.error("Error loading machine telemetry details:", err);
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  useEffect(() => {
    if (user) {
      fetchMachineData();

      const channel = supabase
        .channel(`machine-detail-${machineId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "metrics",
            filter: `machine_id=eq.${machineId}`,
          },
          (payload) => {
            const newMetric = payload.new as Metric;
            setMetrics((prev) => [newMetric, ...prev.slice(0, 34)]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "machines",
            filter: `id=eq.${machineId}`,
          },
          (payload) => {
            setMachine(payload.new as Machine);
          }
        )
        .subscribe();

      const pollInterval = setInterval(() => {
        fetchMachineData();
      }, 8000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollInterval);
      };
    }
  }, [user, machineId, fetchMachineData]);

  const handleDeleteMachine = async () => {
    setIsDeleting(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/v1/machines/${machineId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const { error: sbErr } = await supabase.from("machines").delete().eq("id", machineId);
        if (sbErr) throw new Error(sbErr.message);
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to delete machine:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const latestMetric = useMemo(
    () => (metrics.length > 0 ? metrics[0] : null),
    [metrics]
  );

  const cpuPercent = useMemo(
    () => (latestMetric ? Number(latestMetric.cpu_percent.toFixed(1)) : 0),
    [latestMetric]
  );
  const ramPercent = useMemo(
    () => (latestMetric ? Number(latestMetric.ram_percent.toFixed(1)) : 0),
    [latestMetric]
  );
  const diskPercent = useMemo(
    () => (latestMetric ? Number(latestMetric.disk_percent.toFixed(1)) : 0),
    [latestMetric]
  );
  const ramUsed = useMemo(
    () => (latestMetric ? latestMetric.ram_used_gb.toFixed(1) : "0"),
    [latestMetric]
  );
  const ramTotal = useMemo(
    () => (latestMetric ? latestMetric.ram_total_gb.toFixed(1) : "0"),
    [latestMetric]
  );
  const activeProcesses = useMemo(
    () => (latestMetric ? latestMetric.processes || [] : []),
    [latestMetric]
  );

  const cpuIcon = useMemo(() => <Cpu size={22} className="text-sky-600" />, []);
  const ramIcon = useMemo(() => <HardDrive size={22} className="text-teal-600" />, []);
  const diskIcon = useMemo(() => <Database size={22} className="text-sky-600" />, []);

  if (authLoading || loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-36 bg-slate-200 rounded-xl"></div>
        <div className="double-bezel-outer">
          <div className="double-bezel-inner p-8 h-28 bg-slate-100/50"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="double-bezel-outer">
            <div className="double-bezel-inner p-6 h-44 bg-slate-100/50"></div>
          </div>
          <div className="double-bezel-outer">
            <div className="double-bezel-inner p-6 h-44 bg-slate-100/50"></div>
          </div>
          <div className="double-bezel-outer">
            <div className="double-bezel-inner p-6 h-44 bg-slate-100/50"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!machine) {
    return (
      <div className="space-y-6 text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Machine Node Not Found</h2>
        <p className="text-slate-500 text-sm">
          No telemetry record exists for machine ID &quot;{machineId}&quot;.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Deletion Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        machineName={machine.name}
        isDeleting={isDeleting}
        onConfirm={handleDeleteMachine}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Top Back Navigation & Delete Machine Action */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200/80 text-slate-600 text-xs font-semibold hover:text-slate-900 hover:border-slate-300 transition-all group w-fit"
          >
            <ArrowLeft
              size={14}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold hover:bg-rose-100 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Trash size={15} weight="bold" className="text-rose-600" />
            <span>Delete Machine</span>
          </button>
        </div>

        {/* Machine Header Enclosure */}
        <div className="double-bezel-outer">
          <div className="double-bezel-inner p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 shrink-0">
                <Desktop size={30} weight="duotone" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {machine.name}
                  </h1>
                  <StatusBadge isOnline={machine.is_online} lastSeen={machine.last_seen} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono-data">
                  <span className="flex items-center gap-1">
                    <Desktop size={14} className="text-slate-400" /> Host: {machine.hostname}
                  </span>
                  <span className="flex items-center gap-1">
                    <Key size={14} className="text-slate-400" /> Key: {machine.machine_key}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Live Telemetry Counter */}
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 self-start md:self-auto">
              <Pulse size={24} className="text-sky-500 animate-pulse" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 font-sans">Total Ingested Data</p>
                <p className="text-sm font-extrabold text-slate-900 font-mono-data">
                  {metrics.length} metrics recorded
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Cards (CPU, RAM, Disk) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="CPU Telemetry"
          value={cpuPercent}
          unit="%"
          subtitle="Processing load percentage"
          percent={cpuPercent}
          accentColor="sky"
          icon={cpuIcon}
        />

        <MetricCard
          title="Memory Telemetry"
          value={ramPercent}
          unit="%"
          subtitle={`${ramUsed} GB used of ${ramTotal} GB`}
          percent={ramPercent}
          accentColor="teal"
          icon={ramIcon}
        />

        <MetricCard
          title="Disk Capacity"
          value={diskPercent}
          unit="%"
          subtitle="Primary storage volume usage"
          percent={diskPercent}
          accentColor="sky"
          icon={diskIcon}
        />
      </div>

      {/* Real-time Telemetry Timeline Chart */}
      <div className="double-bezel-outer">
        <div className="double-bezel-inner p-6 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">
                Live Telemetry History
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                CPU Load (Sky Blue) & RAM Memory (Teal) real-time progression
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              Live Stream
            </span>
          </div>

          <MetricChart metrics={metrics} />
        </div>
      </div>

      {/* OpenRouter AI Diagnostics Card */}
      <AIDiagnosticsCard
        machineId={machineId}
        machineName={machine.name}
        latestMetric={latestMetric}
      />

      {/* Top Active Processes Table */}
      <ProcessTable processes={activeProcesses} />
    </div>
  );
}
