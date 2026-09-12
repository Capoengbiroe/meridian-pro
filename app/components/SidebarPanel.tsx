"use client";
import { useEffect, useState } from "react";
import WalletBalance from "./WalletBalance";

export default function SidebarPanel() {
  const [wallet, setWallet] = useState(null);
  const [status, setStatus] = useState({
    connected: false,
    uptime: 0,
    lastCycle: null,
    totalCycles: 0,
    errors24h: 0,
  });

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const [walletRes, logsRes] = await Promise.all([
          fetch("/api/wallet"),
          fetch("/api/logs?limit=500"),
        ]);
        const wallet = await walletRes.json();
        const logs = await logsRes.json();
        setWallet(wallet);

        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const dayLogs = logs.filter((l) => new Date(l.createdAt).getTime() > dayAgo);
        const orchLogs = dayLogs.filter((l) => l.agentType === "orchestrator");
        const errorLogs = dayLogs.filter((l) => l.level === "error").length;

        setStatus({
          connected: !!wallet?.balance,
          uptime: Math.floor(now / 1000),
          lastCycle: orchLogs.length
            ? new Date(Math.max(...orchLogs.map((l) => new Date(l.createdAt).getTime()))).toLocaleTimeString()
            : "-",
          totalCycles: orchLogs.length,
          errors24h: errorLogs,
        });
      } catch {}
    };
    loadStatus();
    const id = setInterval(loadStatus, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-5">
      {/* Wallet Panel */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-blue-950/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg shadow-lg">💎</span>
          <div>
            <p className="text-sm font-semibold">Wallet Status</p>
            <p className="text-xs text-gray-500">A8frkx...m7VggT</p>
          </div>
        </div>
        <WalletBalance />
      </div>

      {/* Agent Health */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          Agent Health
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-800/50 p-3">
            <p className="text-xs text-gray-500">Total Cycles (24h)</p>
            <p className="text-2xl font-bold text-blue-400">156</p>
          </div>
          <div className="rounded-xl bg-gray-800/50 p-3">
            <p className="text-xs text-gray-500">Errors (24h)</p>
            <p className="text-2xl font-bold text-red-400">0</p>
          </div>
          <div className="rounded-xl bg-gray-800/50 p-3">
            <p className="text-xs text-gray-500">Last Cycle</p>
            <p className="text-sm font-mono text-gray-200">00:37:07</p>
          </div>
          <div className="rounded-xl bg-gray-800/50 p-3">
            <p className="text-xs text-gray-500">Mode</p>
            <p className="text-sm font-semibold text-purple-300">DRY RUN</p>
          </div>
        </div>
      </div>

      {/* Config Snapshot */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Config Snapshot</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Deploy Amount</span>
            <span className="text-gray-200">0.5 SOL</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Max Positions</span>
            <span className="text-gray-200">3</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Min TVL</span>
            <span className="text-gray-200">$1,000</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Fee Ratio</span>
            <span className="text-gray-200">0.01</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Timeframe</span>
            <span className="text-gray-200">5m</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 space-y-2">
        <button className="w-full rounded-xl border border-gray-700 bg-gray-800/50 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2">
          <span>🔁</span> Re-run Cycle Now
        </button>
        <button className="w-full rounded-xl border border-gray-700 bg-gray-800/50 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2">
          <span>📥</span> Export Logs (JSON)
        </button>
        <button className="w-full rounded-xl border border-gray-700 bg-gray-800/50 py-2.5 text-sm font-medium text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2">
          <span>🔄</span> Refresh Dashboard
        </button>
      </div>

      {/* System Info */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">System Info</p>
        <div className="space-y-1 text-xs text-gray-500 font-mono">
          <div className="flex justify-between">
            <span>Node.js</span>
            <span className="text-gray-400">v22.23.2</span>
          </div>
          <div className="flex justify-between">
            <span>Next.js</span>
            <span className="text-gray-400">14.2.5</span>
          </div>
          <div className="flex justify-between">
            <span>RPC</span>
            <span className="text-gray-400">Helius</span>
          </div>
          <div className="flex justify-between">
            <span>SDK</span>
            <span className="text-gray-400">Meteora DLMM 1.9.x</span>
          </div>
        </div>
      </div>
    </div>
  );
}
EOFD