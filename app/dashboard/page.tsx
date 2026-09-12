"use client";
import { useState } from "react";
import ConfigForm from "../components/ConfigForm";
import PositionsTable from "../components/PositionsTable";
import DashboardOverview from "../components/DashboardOverview";
import AgentLogs from "../components/AgentLogs";
import SystemActivity from "../components/SystemActivity";
import SidebarPanel from "../components/SidebarPanel";

type Tab = "positions" | "logs" | "activity" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "positions", label: "Positions", icon: "📊" },
  { id: "logs", label: "Agent Logs", icon: "📜" },
  { id: "activity", label: "Activity", icon: "📈" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("positions");

  return (
    <div className="min-h-screen bg-[#070b14] text-gray-100">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 space-y-6">
        <DashboardOverview />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* ============ KONTEN UTAMA (KIRI) ============ */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-1 rounded-xl border border-gray-800 bg-gray-900/60 p-1.5 backdrop-blur">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 min-w-[110px] rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                    tab === t.id
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-900/30"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }`}
                >
                  <span className="mr-1.5">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "positions" && (
              <section className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-200">Open Positions</h2>
                  <span className="text-xs text-gray-500">Auto-refresh 10s</span>
                </div>
                <PositionsTable />
              </section>
            )}

            {tab === "logs" && (
              <section className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-200">Agent Live Stream</h2>
                  <span className="text-xs text-gray-500">Auto-refresh 5s</span>
                </div>
                <AgentLogs />
              </section>
            )}

            {tab === "activity" && (
              <section className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-200">System Activity</h2>
                  <span className="text-xs text-gray-500">24h window</span>
                </div>
                <SystemActivity />
              </section>
            )}

            {tab === "settings" && (
              <section className="space-y-6 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-200">Agent Configuration</h2>
                  <span className="text-xs text-gray-500">Saved to database</span>
                </div>
                <ConfigForm />
              </section>
            )}
          </div>

          {/* ============ SIDEBAR KANAN ============ */}
          <aside className="space-y-6">
            <SidebarPanel />
          </aside>
        </div>

        <footer className="pt-4 border-t border-gray-800/50 text-center text-xs text-gray-600">
          Meridian Pro · Autonomous Meteora DLMM Agent · Solana
        </footer>
      </div>
    </div>
  );
}