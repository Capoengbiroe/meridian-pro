"use client";
import { useEffect, useState } from "react";
import WalletBalance from "./WalletBalance";

export default function DashboardOverview() {
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
        status: isDryRun ? "Idle (Dry Run)" : "Active (Live)",
        dryRun: isDryRun,
      });
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
        body: JSON.stringify({ ...configData.trading, dryRun: !metrics.dryRun }),
      });
      if (res.ok) await loadMetrics();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 animate-pulse">Loading...</div>;
  if (error) return <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-red-400">Error.</div>;

  return (
    <div className="bg-gray-900 rounded-xl p-8 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Dashboard <span className="text-xs bg-blue-600 px-2 py-0.5 rounded ml-2">V2.2</span></h2>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${metrics.dryRun ? 'bg-yellow-500' : 'bg-green-500 animate-ping'}`}></span>
          <span className="text-sm font-medium">{metrics.status}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <WalletBalance />
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total PnL</p>
          <p className={`text-2xl font-bold ${metrics.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.totalPnl >= 0 ? '+' : ''}{metrics.totalPnl.toFixed(4)} SOL
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Positions</p>
          <p className="text-2xl font-bold text-blue-400">{metrics.openPositions}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Fees</p>
          <p className="text-2xl font-bold text-yellow-400">{metrics.unclaimedFees.toFixed(4)} SOL</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Mode</p>
          <p className="text-2xl font-bold text-purple-400">{metrics.dryRun ? 'Paper' : 'Live'}</p>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={toggleAgent}
          disabled={isUpdating}
          className={`px-10 py-3 rounded-xl font-bold text-lg shadow-lg ${metrics.dryRun ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {isUpdating ? 'Executing...' : (metrics.dryRun ? 'ACTIVATE LIVE' : 'STOP LIVE')}
        </button>
      </div>
    </div>
  );
}