"use client";
import { useEffect, useState } from "react";

export default function PositionsTable() {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) return <p className="text-gray-400">Loading positions...</p>;
  if (error) return <p className="text-red-400">Failed to load positions</p>;
  if (data.length === 0) return <p className="text-gray-400">No open positions</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="min-w-full divide-y divide-gray-800">
        <thead className="bg-gray-900">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Pool</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Pair</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Amount</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">TVL</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Vol 24h</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Price 24h</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">PnL</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Fees</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {data.map((pos) => {
            const d = pos.poolDetail;
            const pnl = pos.currentPnl || 0;
            const fees = pos.unclaimedFees || 0;
            return (
              <tr key={pos.id} className="hover:bg-gray-800">
                <td className="px-4 py-2 text-sm text-gray-300 font-mono text-xs">
                  {pos.poolAddress?.slice(0, 12)}...
                </td>
                <td className="px-4 py-2 text-sm text-gray-200">
                  {d ? `${d.baseSymbol}/${d.quoteSymbol}` : pos.poolName}
                </td>
                <td className="px-4 py-2 text-sm text-gray-200">
                  {pos.deployAmount.toFixed(3)} SOL
                </td>
                <td className="px-4 py-2 text-sm text-gray-200">
                  {d ? `$${(d.reserveInUsd / 1000).toFixed(0)}k` : "-"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-200">
                  {d ? `$${(d.h24VolumeUsd / 1000).toFixed(0)}k` : "-"}
                </td>
                <td className={`px-4 py-2 text-sm ${d?.priceChange24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {d ? `${d.priceChange24h?.toFixed(2)}%` : "-"}
                </td>
                <td className={`px-4 py-2 text-sm font-semibold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {pnl >= 0 ? "+" : ""}{pnl.toFixed(4)} SOL
                </td>
                <td className="px-4 py-2 text-sm text-yellow-400">{fees.toFixed(4)}</td>
                <td className="px-4 py-2 text-sm">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${pos.status === "OPEN" ? "bg-blue-900/50 text-blue-300" : "bg-gray-700 text-gray-300"}`}>
                    {pos.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}