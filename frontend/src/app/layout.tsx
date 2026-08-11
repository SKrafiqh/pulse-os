import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pulse OS | Autonomous Machine Telemetry & Fleet Monitoring",
  description: "Real-time system telemetry and machine monitoring dashboard for modern infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakartaSans.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col selection:bg-sky-100 selection:text-sky-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="w-full border-t border-slate-200/60 bg-slate-50/50 py-6 mt-12 text-center text-xs text-slate-400">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-500"></span>
                <span className="font-semibold text-slate-700">Pulse OS</span>
                <span>&bull; Autonomous Telemetry Platform</span>
              </div>
              <div>
                Powered by Supabase Engine & Next.js App Router
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
