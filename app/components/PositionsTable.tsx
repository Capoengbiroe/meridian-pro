"use client";
import { useEffect, useState } from "react";

export default function PositionsTable() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/positions")
        .then((res) => res.json())
        .then((json) => {
          if (!cancelled) {
            setData(json);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err);
            setIsLoading(false);
          }
        });
    load();
    const id = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (isLoading)
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        <p className="mt-3 text-sm text-gray-500">Loading positions...</p>
      </div>
    );
  if (error) return <p className="rounded-2xl border border-red-900/40 bg-red-950/40 p-4 text-red-400">Failed to load positions</p>;
  if (data.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-10 text-center">
        <p className="text-3xl">📭</p>
        <p className="mt-2 text-sm text-gray-500">No open positions yet</p>
        <p className="text-xs text-gray-600 mt-1">The agent is scanning for profitable pools</p>
      </div>
    );

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800/70">
          <thead className="bg-gray-950/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pool</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pair</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TVL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vol 24h</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price 24h</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PnL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fees</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.map((pos) => {
              const d = pos.poolDetail;
              const pnl = pos.currentPnl || 0;
              const fees = pos.unclaimedFees || 0;
              const isOpen = expanded === pos.id;
              return (
                <>
                  <tr
                    key={pos.id}
                    onClick={() => setExpanded(isOpen ? null : pos.id)}
                    className="hover:bg-gray-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-400 font-mono text-xs">
                      {pos.poolAddress?.slice(0, 8)}...{pos.poolAddress?.slice(-4)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-200">
                      <span className="font-semibold">
                        {d ? `${d.baseSymbol}/${d.quoteSymbol}` : pos.poolName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-200">{pos.deployAmount.toFixed(3)} SOL</td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {d ? `$${(d.reserveInUsd / 1000).toFixed(0)}k` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {d ? `$${(d.h24VolumeUsd / 1000).toFixed(0)}k` : "-"}
                    </td>
                    <td className={`px-4 py-3 text-sm ${d?.priceChange24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {d ? `${d.priceChange24h >= 0 ? "▲" : "▼"} ${d.priceChange24h?.toFixed(2)}%` : "-"}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pnl >= 0 ? "+" : ""}{pnl.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-sm text-yellow-300">{fees.toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        pos.status === "OPEN"
                          ? "bg-green-900/50 text-green-300 border border-green-800"
                          : "bg-purple-900/50 text-purple-300 border border-purple-800"
                      }`}>
                        {pos.status === "SIMULATED" ? "SIMULATED" : pos.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-600">{isOpen ? "▲" : "▼"}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${pos.id}-detail`} className="bg-gray-950/60">
                      <td colSpan={10} className="px-4 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <p className="text-gray-500 mb-1">Entry Price</p>
                            <p className="text-gray-200 font-mono">{pos.entryPrice ?? "-"} SOL</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Opened</p>
                            <p className="text-gray-200">{new Date(pos.openedAt).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Address</p>
                            <p className="text-gray-200 font-mono break-all">{pos.poolAddress}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 mb-1">Base Price</p>
                            <p className="text-gray-200">${parseFloat(d?.basePriceUsd || 0).toFixed(6)}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}