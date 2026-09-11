"use client";
import { useEffect, useState } from "react";

export default function ConfigForm() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then(setData)
      .catch(setError);
  }, []);

  if (!data) return <p className="text-gray-400">Loading configuration…</p>;
  if (error) return <p className="text-red-400">Failed to load config</p>;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : Number(value) || value;
    
    // Identifikasi field ini milik trading atau screening
    const tradingKeys = ['deployAmountSol', 'maxPositions', 'minSolToOpen', 'managementIntervalMin', 'screeningIntervalMin', 'dryRun', 'rpcUrl'];
    const targetGroup = tradingKeys.includes(name) ? 'trading' : 'screening';
    
    setData({ 
        ...data, 
        [targetGroup]: { ...data[targetGroup], [name]: val } 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) alert("Config saved!");
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          Deploy amount (SOL)
          <input type="number" step="0.01" name="deployAmountSol" defaultValue={data.trading?.deployAmountSol} onChange={handleChange} className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm" />
        </label>
        <label className="block">
          Max positions
          <input type="number" name="maxPositions" defaultValue={data.trading?.maxPositions} onChange={handleChange} className="mt-1 w-full rounded bg-gray-800 px-2 py-1 text-sm" />
        </label>
      </div>
      <button type="submit" className="mt-6 rounded bg-blue-600 px-4 py-2 font-medium">Save configuration</button>
    </form>
  );
}