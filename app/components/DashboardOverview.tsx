"use client";
import { useEffect, useState } from "react";

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
      
      if (!configRes.ok || !positionsRes.ok) throw new Error("API Error");
      
      const config = await configRes.json();
      const positions = await positionsRes.json();
      
      setConfigData(config);
      
      const posArray = Array.isArray(positions) ? positions : [];
      const totalPnl = posArray.reduce((sum, pos) => sum + (pos.currentPnl || 0), 0);
      const openPositions = posArray.filter((pos) => pos.status === "OPEN").length;
      const unclaimedFees = posArray.reduce((sum, pos) => sum + (pos.unclaimedFees || 0), 0);
      
      // Fix: dryRun is inside trading object
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
      console.error("Dashboard metrics error:", err);
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
          ...configData.trading, 
          dryRun: !metrics.dryRun 
        }),
      });
      if (res.ok) await loadMetrics();
    } catch (err) {
      console.error("Toggle agent error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 animate-pulse">Loading Dashboard Metrics...</div>;
  if (error) return (
    <div className="bg-red-900/20 rounded-xl p-8 border border-red-800 text-red-400">
      <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
      <p>{error.message}</p>
      <button onClick={loadMetrics} className="mt-4 underline text-sm">Retry</button>
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-xl p-8 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Dashboard Overview <span className="text-xs bg-blue-600 px-2 py-0.5 rounded ml-2">V2.1</span></h2>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${metrics.dryRun ? 'bg-yellow-500' : 'bg-green-500 animate-ping'}`}></span>
          <span className="text-sm font-medium">{metrics.status}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total PnL</p>
          <p className={`text-2xl font-bold ${metrics.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.totalPnl >= 0 ? '+' : ''}{metrics.totalPnl.toFixed(4)} SOL
          </p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Open Positions</p>
          <p className="text-2xl font-bold text-blue-400">{metrics.openPositions}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Unclaimed Fees</p>
          <p className="text-2xl font-bold text-yellow-400">{metrics.unclaimedFees.toFixed(4)} SOL</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Agent Mode</p>
          <p className="text-2xl font-bold text-purple-400">{metrics.dryRun ? 'Paper' : 'Live'}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <button
          onClick={toggleAgent}
          disabled={isUpdating}
          className={`w-full max-w-xs py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 ${
            isUpdating 
              ? 'bg-gray-700 cursor-not-allowed' 
              : (metrics.dryRun 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-900/20' 
                  : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-900/20')
          }`}
        >
          {isUpdating ? 'Executing...' : (metrics.dryRun ? 'ACTIVATE LIVE TRADING' : 'STOP LIVE TRADING')}
        </button>
        <p className="text-gray-500 text-xs">
          {metrics.dryRun 
            ? "Agent is currently in simulation mode. No real SOL will be traded." 
            : "Agent is LIVE. Real assets are being managed on Solana mainnet."}
        </p>
      </div>
    </div>
  );
}
