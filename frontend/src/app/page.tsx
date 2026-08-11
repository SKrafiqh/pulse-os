"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import {
  Pulse,
  ArrowRight,
  Cpu,
  Lightning,
  ShieldCheck,
  HardDrives,
  Terminal,
  Desktop,
  CheckCircle,
} from "@phosphor-icons/react";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-24 py-6 sm:py-12">
      {/* 1. ASYMMETRIC HERO SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Content Column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="lg:col-span-7 space-y-6"
        >
          {/* Eyebrow Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-sky-800 text-[10px] uppercase font-bold tracking-[0.2em]">
            <Pulse size={14} className="text-sky-600 animate-pulse" />
            Autonomous Infrastructure Telemetry
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tighter leading-[1.08]">
            Real-time node monitoring built for speed &amp; simplicity.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed max-w-xl">
            Pulse OS bridges host agents with Supabase Postgres to stream CPU, RAM, disk, and process telemetry with sub-second latency.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="group relative inline-flex items-center gap-3 pl-6 pr-2 py-3.5 rounded-full bg-slate-900 text-white font-semibold text-sm hover:bg-sky-600 active:scale-[0.98] transition-all duration-200 shadow-md shadow-slate-900/10"
            >
              <span>{user ? "Launch Dashboard" : "Get Started Now"}</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-200">
                <ArrowRight size={14} weight="bold" />
              </div>
            </Link>

            <Link
              href="https://github.com"
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white border border-slate-200/80 text-slate-700 font-semibold text-sm hover:bg-slate-50 active:scale-[0.98] transition-all shadow-2xs"
            >
              <Terminal size={18} className="text-slate-500" />
              <span>Deploy Collector Agent</span>
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="flex items-center gap-6 pt-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle size={16} className="text-emerald-500" /> Supabase Realtime
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle size={16} className="text-emerald-500" /> Sub-second Latency
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle size={16} className="text-emerald-500" /> Zero Overhead
            </span>
          </div>
        </motion.div>

        {/* Right Preview Card Widget */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:col-span-5"
        >
          <div className="double-bezel-outer">
            <div className="double-bezel-inner p-6 space-y-5">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                    <Desktop size={22} weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">macbook-m5.local</h3>
                    <p className="text-[11px] text-slate-400 font-mono-data">key: desktop-secret-key-001</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Node
                </div>
              </div>

              {/* Gauge Indicators */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 font-mono-data text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>CPU Processing</span>
                    <span className="text-sky-600">14.2%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full w-[14%] transition-all duration-500"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-700 font-semibold">
                    <span>RAM Allocation</span>
                    <span className="text-teal-600">58.3% (9.3/16.0 GB)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full w-[58%] transition-all duration-500"></div>
                  </div>
                </div>
              </div>

              {/* Mini Top Process snippet */}
              <div className="pt-2 space-y-2 border-t border-slate-100 text-xs">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Top Process</p>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 font-mono-data">
                  <span className="font-bold text-slate-800">Antigravity</span>
                  <span className="text-amber-600 font-semibold">4.8% CPU &bull; 3.4% RAM</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. ASYMMETRICAL BENTO FEATURES GRID */}
      <section className="space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-[10px] uppercase font-bold tracking-[0.2em]">
            <Lightning size={14} className="text-teal-600" />
            Architecture Overview
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Engineered for high-frequency infrastructure tracking.
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Pulse OS combines native host metrics collection with instant PostgreSQL sync.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Feature 1: Bento 7 columns */}
          <div className="md:col-span-7 double-bezel-outer">
            <div className="double-bezel-inner p-8 flex flex-col justify-between h-full space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <Pulse size={28} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Sub-Second Realtime Ingestion
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Every metric tick sent by the host agent is ingested via FastAPI and broadcast live to your frontend through Supabase Realtime channels.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 text-slate-300 font-mono-data text-xs space-y-1">
                <p className="text-sky-400">$ python3 agent/main.py</p>
                <p className="text-slate-400">[INFO] Telemetry: CPU 4.5% | RAM 82.1% | Ingested into Supabase (201 Created)</p>
              </div>
            </div>
          </div>

          {/* Feature 2: Bento 5 columns */}
          <div className="md:col-span-5 double-bezel-outer">
            <div className="double-bezel-inner p-8 flex flex-col justify-between h-full space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <Cpu size={28} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Process Level Inspector
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Track top resource consumers in real time. Quickly identify rogue processes causing CPU spikes or RAM leaks.
                </p>
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 font-mono-data">
                  <span className="font-semibold text-slate-800">Chrome (PID 101)</span>
                  <span className="text-sky-600 font-bold">6.2% CPU</span>
                </div>
                <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50 font-mono-data">
                  <span className="font-semibold text-slate-800">Antigravity (PID 202)</span>
                  <span className="text-teal-600 font-bold">4.8% CPU</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: Bento 5 columns */}
          <div className="md:col-span-5 double-bezel-outer">
            <div className="double-bezel-inner p-8 flex flex-col justify-between h-full space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <ShieldCheck size={28} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Supabase Security &amp; Auth
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Role-based data safety backed by Supabase Auth and Row Level Security policies. Protect node management with encrypted session tokens.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 4: Bento 7 columns */}
          <div className="md:col-span-7 double-bezel-outer">
            <div className="double-bezel-inner p-8 flex flex-col justify-between h-full space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                <HardDrives size={28} weight="duotone" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Doppelrand Visual Aesthetics
                </h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Clean SaaS light theme with outer chassis frames and inner content cores, desaturated sky/teal accents, and 60 FPS Recharts telemetry history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CALL TO ACTION BANNER */}
      <section className="double-bezel-outer text-center">
        <div className="double-bezel-inner p-10 sm:p-14 space-y-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[calc(1.75rem-0.375rem)]">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to monitor your infrastructure in real time?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto font-medium">
            Launch the Pulse OS telemetry dashboard or deploy a Python host agent on your machines in under two minutes.
          </p>
          <div className="pt-2">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="group relative inline-flex items-center gap-3 pl-6 pr-2 py-3.5 rounded-full bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 active:scale-[0.98] transition-all duration-200 shadow-md shadow-sky-500/20"
            >
              <span>{user ? "Open Dashboard" : "Sign In &amp; Launch"}</span>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-200">
                <ArrowRight size={14} weight="bold" />
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
