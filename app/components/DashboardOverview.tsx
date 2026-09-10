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

      const config = await configRes.json();
      const positions = await positionsRes.json();

      setConfigData(config);

      // Calculate metrics
      const totalPnl = positions.reduce((sum, pos) => sum + pos.currentPnl, 0);
      const openPositions = positions.filter((pos) => pos.status === "OPEN").length;
      const unclaimedFees = positions.reduce((sum, pos) => sum + pos.unclaimedFees, 0);
      
      let agentStatus = "Idle";
      if (config.dryRun === false) {
        agentStatus = "Active";
      }

      setMetrics({
        totalPnl,
        openPositions,
        unclaimedFees,
        status: agentStatus,
        dryRun: config.dryRun,
      });
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
      setError(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    const id = setInterval(loadMetrics, 10000); // Refresh every 10 seconds

    return () => clearInterval(id);
  }, []);

  const toggleAgent = async () => {
    if (!configData || isUpdating) return;
    setIsUpdating(true);
    try {
      const newDryRun = !metrics.dryRun;
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...configData, dryRun: newDryRun }),
      });
      if (res.ok) {
        await loadMetrics();
      }
    } catch (err) {
      console.error("Failed to toggle agent:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading)
    return (
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
        <p className="text-gray-400">Loading metrics...</p>
      </div>
    );
  if (error)
    return (
      <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
        <p className="text-red-400">Failed to load metrics: {error.message}</p>
      </div>
    );

  return (
    <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
      <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total PnL</p>
          <p className="text-2xl font-bold text-green-400">
            {metrics.totalPnl.toFixed(3)} SOL
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Open Positions</p>
          <p className="text-2xl font-bold text-blue-400">
            {metrics.openPositions}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Unclaimed Fees</p>
          <p className="text-2xl font-bold text-yellow-400">
            {metrics.unclaimedFees.toFixed(3)} SOL
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Status</p>
          <p className={`text-2xl font-bold ${metrics.status === "Active" ? "text-green-400" : "text-red-400"}`}>
            {metrics.status}
          </p>
        </div>
      </div>
      <div className="mt-6 flex justify-center">
        <button
          onClick={toggleAgent}
          disabled={isUpdating}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${isUpdating ? 'bg-gray-700 cursor-not-allowed' : (metrics.dryRun ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500')}`}
        >
          {isUpdating ? 'Updating...' : (metrics.dryRun ? 'Start Agent' : 'Stop Agent')}
        </button>
      </div>
    </div>
  );
}
