"use client";

import { useState } from "react";
import { Metric } from "@/lib/supabase";
import { Sparkle, Brain, CheckCircle, WarningCircle, ArrowsClockwise, Cpu } from "@phosphor-icons/react";

interface AIDiagnosticsCardProps {
  machineId: string;
  machineName: string;
  latestMetric?: Metric | null;
}

interface AIAnalysisResult {
  summary: string;
  analysis: string;
  recommendations: string[];
  model_used: string;
}

export default function AIDiagnosticsCard({
  machineId,
  machineName,
  latestMetric,
}: AIDiagnosticsCardProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        machine_id: machineId,
        machine_name: machineName,
        cpu_percent: latestMetric ? latestMetric.cpu_percent : 0,
        ram_percent: latestMetric ? latestMetric.ram_percent : 0,
        ram_used_gb: latestMetric ? latestMetric.ram_used_gb : 0,
        ram_total_gb: latestMetric ? latestMetric.ram_total_gb : 0,
        disk_percent: latestMetric ? latestMetric.disk_percent : 0,
        processes: latestMetric ? latestMetric.processes || [] : [],
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const targetUrl = `${backendUrl}/api/v1/ai/analyze`;

      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`AI Service error (${res.status}): ${errorText || res.statusText}`);
      }

      const data: AIAnalysisResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect to backend AI service.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="double-bezel-outer">
      <div className="double-bezel-inner p-6 sm:p-8 space-y-6">
        {/* Header Bar: Title & AI Trigger Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Brain size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base tracking-tight">
                  OpenRouter AI Diagnostics
                </h3>
                <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                  Free Model Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Automated system health analysis &amp; load bottleneck diagnosis
              </p>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="group relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-sky-600 active:scale-95 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-60 self-start sm:self-auto"
          >
            {loading ? (
              <ArrowsClockwise size={16} className="animate-spin text-amber-400" />
            ) : (
              <Sparkle size={16} weight="fill" className="text-amber-400 group-hover:rotate-12 transition-transform" />
            )}
            <span>{loading ? "Running AI Diagnosis..." : result ? "Re-analyze with AI" : "Analyze with AI"}</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 font-medium">
            <WarningCircle size={20} className="text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && !result && (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-slate-200"></div>
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            </div>
            <div className="h-16 bg-slate-200/60 rounded-xl"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-200/60 rounded w-full"></div>
              <div className="h-3 bg-slate-200/60 rounded w-4/5"></div>
            </div>
          </div>
        )}

        {/* AI Results Display Card */}
        {result && (
          <div className="space-y-5 pt-2">
            {/* Health Summary Box */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/70 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                <span className="flex items-center gap-1.5">
                  <Sparkle size={15} weight="fill" className="text-sky-600" />
                  Health Summary
                </span>
                <span className="font-mono-data text-[10px] font-semibold text-sky-700/80 bg-white/80 px-2 py-0.5 rounded-full border border-sky-200/60">
                  {result.model_used}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                {result.summary}
              </p>
            </div>

            {/* Technical Analysis */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Cpu size={14} className="text-slate-500" />
                Technical Diagnosis
              </h4>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed font-medium">
                {result.analysis}
              </div>
            </div>

            {/* Actionable Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-teal-600" />
                Recommended Actions ({result.recommendations.length})
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {result.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs text-xs text-slate-800 font-medium"
                  >
                    <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-[10px] shrink-0 border border-teal-100">
                      {idx + 1}
                    </div>
                    <span className="leading-snug pt-0.5">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
