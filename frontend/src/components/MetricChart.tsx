"use client";

import { useEffect, useState, useMemo, memo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Metric } from "@/lib/supabase";

interface MetricChartProps {
  metrics: Metric[];
}

function MetricChartComponent({ metrics }: MetricChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Limit metrics to max 35 points and transform with useMemo
  const chartData = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    
    // Take latest 35 points and reverse for chronological order (oldest -> newest)
    return metrics
      .slice(0, 35)
      .reverse()
      .map((m) => {
        const date = new Date(m.created_at);
        const timeStr = date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        return {
          timestamp: timeStr,
          cpu: Number(m.cpu_percent.toFixed(1)),
          ram: Number(m.ram_percent.toFixed(1)),
          disk: Number(m.disk_percent.toFixed(1)),
        };
      });
  }, [metrics]);

  if (!mounted) {
    return (
      <div className="h-72 w-full flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200/60 animate-pulse text-slate-400 text-xs font-mono-data">
        Initializing telemetry timeline chart...
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-72 w-full flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-200/60 text-slate-400 text-xs font-mono-data">
        No historical metric data available yet.
      </div>
    );
  }

  return (
    <div className="w-full h-80 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="timestamp"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            domain={[0, 100]}
            unit="%"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5 font-mono-data">
                    <p className="text-slate-400 text-[10px] pb-1 border-b border-slate-800">
                      Time: {label}
                    </p>
                    <div className="flex items-center justify-between gap-4 text-sky-400">
                      <span>CPU Load:</span>
                      <span className="font-bold">{payload[0].value}%</span>
                    </div>
                    {payload[1] && (
                      <div className="flex items-center justify-between gap-4 text-teal-400">
                        <span>RAM Memory:</span>
                        <span className="font-bold">{payload[1].value}%</span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="cpu"
            name="CPU (%)"
            stroke="#0ea5e9"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#cpuGradient)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="ram"
            name="RAM (%)"
            stroke="#0d9488"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#ramGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const MetricChart = memo(MetricChartComponent);
export default MetricChart;
