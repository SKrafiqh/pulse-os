"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Pulse, HardDrives, SignOut, ArrowRight, UserCircle } from "@phosphor-icons/react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full pt-4 px-4 sm:px-6 lg:px-8 bg-transparent backdrop-blur-md">
      <div className="max-w-7xl mx-auto">
        <div className="double-bezel-outer p-1 bg-slate-100/90 border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="double-bezel-inner bg-white/95 rounded-xl px-5 py-3 flex items-center justify-between">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
                <Pulse size={22} weight="bold" className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-slate-900">Pulse OS</span>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-sky-50 text-sky-700 border border-sky-200/60 rounded-full">
                    v1.0
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Realtime Node Telemetry</span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
              <Link
                href="/"
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  pathname === "/"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                Overview
              </Link>
              {user && (
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    pathname.startsWith("/dashboard") || pathname.startsWith("/machines")
                      ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <HardDrives size={15} className="text-sky-600" />
                  Dashboard
                </Link>
              )}
            </nav>

            {/* Right User Actions / Auth Pill */}
            <div className="flex items-center gap-3">
              {loading ? (
                <div className="h-8 w-20 bg-slate-100 rounded-full animate-pulse"></div>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-mono-data text-slate-700">
                    <UserCircle size={18} className="text-sky-600" />
                    <span className="truncate max-w-[140px] font-semibold">{user.email}</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 text-xs font-semibold transition-all cursor-pointer"
                    title="Sign Out"
                  >
                    <SignOut size={14} />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="group relative inline-flex items-center gap-2 pl-4 pr-1.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-sky-600 active:scale-95 transition-all duration-200 shadow-sm"
                >
                  <span>Sign In</span>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform duration-200">
                    <ArrowRight size={12} weight="bold" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
