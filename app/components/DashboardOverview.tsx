"use client";
import { useEffect, useState } from "react";
import WalletBalance from "./WalletBalance";
import { useRouter } from "next/navigation";

export default function DashboardOverview() {
  const router = useRouter();
  const [metrics, setMetrics] = useState({
    totalPnl: 0,
    openPositions: 0,
    unclaimedFees: 0,
    status: "Idle",
    dryRun: true,
  });
  const [configData, setConfigData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMetrics = async () => {
    try {
      const [configRes, positionsRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/positions"),
      ]);
      const config = await configRes.json();
      const positions = await positionsRes.json();
      setConfigData(config);
      const posArray = Array.isArray(positions) ? positions : [];
      const totalPnl = posArray.reduce((sum, pos) => sum + (pos.currentPnl || 0), 0);
      const openPositions = posArray.filter((pos) => pos.status === "OPEN").length;
      const unclaimedFees = posArray.reduce((sum, pos) => sum + (pos.unclaimedFees || 0), 0);
      const isDryRun = config.trading?.dryRun !== false;

      setMetrics({
        totalPnl,
        openPositions,
        unclaimedFees,
        status: isDryRun ? "Dry Run Mode" : "Live Trading",
        dryRun: isDryRun,
      });
      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const id = setInterval(loadMetrics, 10000);
    return () => clearInterval(id);
  }, []);

  const toggleAgent = async () => {
    if (!configData || isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trading: { ...configData.trading, dryRun: !metrics.dryRun }
        }),
      });
      if (res.ok) await loadMetrics();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const cfg = configData?.trading || {};

  return (
    <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900/80 to-blue-950/40 p-6 shadow-2xl shadow-blue-950/20">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-blue-900/40">
            ⚡
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Meridian <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Pro</span>
            </h1>
            <p className="text-xs text-gray-500">Meteora DLMM · Autonomous Agent</p>
          </div>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-700/60 bg-gray-800/70 px-3 py-1.5">
            <span className={`relative flex h-2.5 w-2.5`}>
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${metrics.dryRun ? "bg-amber-400" : "bg-green-400"}`}></span>
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${metrics.dryRun ? "bg-amber-400" : "bg-green-400"}`}></span>
            </span>
            <span className={`text-sm font-semibold ${metrics.dryRun ? "text-amber-300" : "text-green-300"}`}>
              {metrics.dryRun ? "DRY RUN" : "● LIVE"}
            </span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-600 hidden sm:block">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <WalletBalance />
        <MetricCard
          label="Total PnL"
          value={`${metrics.totalPnl >= 0 ? "+" : ""}${metrics.totalPnl.toFixed(4)}`}
          unit="SOL"
          color={metrics.totalPnl >= 0 ? "text-green-400" : "text-red-400"}
          accent="from-green-500/20"
          spark={[0, 1, 2, 3, 2, 4]}
        />
        <MetricCard
          label="Position"
          value={metrics.openPositions}
          unit="active"
          color="text-blue-300"
          accent="from-blue-500/20"
          spark={[0, 0, 1, 2, 2, 3]}
        />
        <MetricCard
          label="Unclaimed Fees"
          value={`${metrics.unclaimedFees.toFixed(4)}`}
          unit="SOL"
          color="text-yellow-300"
          accent="from-yellow-500/20"
          spark={[1, 1, 2, 2, 3, 3]}
        />
      </div>

      {/* Config summary + CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-800/60 bg-gray-900/40 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <p className="text-gray-500">Deploy Amount</p>
            <p className="text-sm font-semibold text-gray-200">{cfg.deployAmountSol ?? 0.5} SOL</p>
          </div>
          <div>
            <p className="text-gray-500">Max Positions</p>
            <p className="text-sm font-semibold text-gray-200">{cfg.maxPositions ?? 3}</p>
          </div>
          <div>
            <p className="text-gray-500">Min TVL</p>
            <p className="text-sm font-semibold text-gray-200">{configData?.screening?.minTvl ?? "-"}$</p>
          </div>
          <div>
            <p className="text-gray-500">Cycle</p>
            <p className="text-sm font-semibold text-gray-200">{cfg.screeningIntervalMin ?? 30}m</p>
          </div>
        </div>

        <button
          onClick={toggleAgent}
          disabled={isUpdating}
          className={`px-6 py-3 rounded-xl font-bold text-base shadow-xl transition-all transform active:scale-95 disabled:opacity-60 ${
            metrics.dryRun
              ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-green-900/40"
              : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 shadow-red-900/40"
          }`}
        >
          {isUpdating ? "⏳ Processing..." : metrics.dryRun ? "▶ ACTIVATE LIVE" : "⏹ STOP LIVE"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-950/40 border border-red-900/40 p-3 text-sm text-red-400">
          Failed to load dashboard data
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, unit, color, accent, spark }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/70 p-4 backdrop-blur transition-all hover:border-gray-700">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent} to-transparent opacity-30`} />
      <div className="relative">
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
        <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-gray-600">{unit}</p>
        <div className="mt-3 flex items-end gap-0.5 h-6">
          {spark.map((h, i) => (
            <div
              key={i}
              className="w-2 rounded-t bg-current opacity-40"
              style={{ height: `${Math.max(4, h * 5)}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}