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

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="min-w-full divide-y divide-gray-800">
        <thead className="bg-gray-900">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
              Pool
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
              Amount (SOL)
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
              PnL
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
              Fees
            </th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {data.map((pos) => (
            <tr key={pos.id} className="hover:bg-gray-800">
              <td className="px-4 py-2 text-sm text-gray-200">
                {pos.poolName || pos.poolAddress}
              </td>
              <td className="px-4 py-2 text-sm text-gray-200">
                {pos.deployAmount.toFixed(3)}
              </td>
              <td className="px-4 py-2 text-sm text-gray-200">
                {pos.currentPnl.toFixed(3)} SOL
              </td>
              <td className="px-4 py-2 text-sm text-gray-200">
                {pos.unclaimedFees.toFixed(3)}
              </td>
              <td className="px-4 py-2 text-sm text-gray-200">
                {pos.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}