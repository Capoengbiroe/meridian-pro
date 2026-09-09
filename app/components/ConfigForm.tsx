import useSWR from "swr";

export default function ConfigForm() {
  const { data, error, mutate } = useSWR("/api/config", (url) =>
    fetch(url).then((res) => res.json())
  );

  if (!data) return <p className="text-gray-400">Loading configuration…</p>;
  if (error) return <p className="text-red-400">Failed to load config</p>;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : Number(value) || value;
    mutate({ ...data, [name]: val }, false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...data };
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) mutate();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          Deploy amount (SOL)
          <input
            type="number"
            step="0.01"
            name="deployAmountSol"
            defaultValue={data.trading?.deployAmountSol}
            onChange={handleChange}
            className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          Max positions
          <input
            type="number"
            name="maxPositions"
            defaultValue={data.trading?.maxPositions}
            onChange={handleChange}
            className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          Dry run
          <input
            type="checkbox"
            name="dryRun"
            defaultChecked={data.trading?.dryRun}
            onChange={handleChange}
            className="mt-1"
          />
        </label>
        <label className="block">
          RPC URL
          <input
            type="text"
            name="rpcUrl"
            defaultValue={data.trading?.rpcUrl}
            onChange={handleChange}
            className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm"
          />
        </label>
      </div>

      <h3 className="text-lg font-medium mt-4 mb-2">Screening thresholds</h3>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          Min TVL (USD)
          <input
            type="number"
            name="minTvl"
            defaultValue={data.screening?.minTvl}
            onChange={handleChange}
            className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          Max TVL (USD)
          <input
            type="number"
            name="maxTvl"
            defaultValue={data.screening?.maxTvl}
            onChange={handleChange}
            className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          Min fee/TVL ratio
          <input
            type="number"
            step="0.01"
            name="minFeeActiveTvlRatio"
            defaultValue={data.screening?.minFeeActiveTvlRatio}
            onChange={handleChange}
            className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          Timeframe
          <select
            name="timeframe"
            defaultValue={data.screening?.timeframe}
            onChange={handleChange}
            className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm"
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="mt-6 rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-500"
      >
        Save configuration
      </button>
    </form>
  );
}