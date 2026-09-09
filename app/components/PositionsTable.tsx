import useSWR from "swr";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function PositionsTable() {
  const { data, error, isLoading } = useSWR("/api/positions", fetcher, {
    refreshInterval: 10_000,
  });

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