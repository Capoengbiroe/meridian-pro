"use client";
import { useEffect, useState } from "react";

export default function SystemActivity() {
  const [stats, setStats] = useState({ lastActivity: null, total24h: 0, hourly: [] });
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/stats");
        const json = await res.json();
        setStats(json);
        if (json.lastActivity) {
          const since = Date.now() - new Date(json.lastActivity).getTime();
          setIsLive(since < 15 * 60 * 1000);
        }
      } catch {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const max = Math.max(1, ...stats.hourly.map((h) => h.count));
  const formatTime = (iso) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    } catch { return iso; }
  };
  const minutesSince = stats.lastActivity
    ? Math.round((Date.now() - new Date(stats.lastActivity).getTime()) / 60000)
    : null;

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6 backdrop-blur">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-200">System Activity</h3>
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400"></span>
              </span>
              <span className="text-xs font-medium text-green-400">ACTIVE</span>
            </>
          ) : (
            <span className="text-xs text-gray-500">STANDING BY</span>
          )}
        </div>
      </div>

      <div className="flex items-end gap-1 h-28 mb-3 rounded-lg bg-gray-950/50 p-2">
        {stats.hourly.map((h) => (
          <div key={h.hour} className="flex flex-col items-center flex-1 group" title={`${h.hour}:00 — ${h.count} event`}>
            <div className="relative flex items-end w-full h-full">
              <div
                className={`w-full rounded-t transition-all duration-500 group-hover:opacity-100 ${
                  h.count > 0
                    ? "bg-gradient-to-t from-blue-600 to-purple-400 opacity-90"
                    : "bg-gray-800"
                }`}
                style={{ height: `${Math.max((h.count / max) * 100, 4)}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-600 mt-1 select-none">{h.hour}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-3">
        <span>
          {stats.lastActivity
            ? `Last: ${formatTime(stats.lastActivity)}${minutesSince !== null ? ` (${minutesSince}m ago)` : ""}`
            : "No activity yet"}
        </span>
        <span className="font-medium text-blue-300">{stats.total24h} events / 24h</span>
      </div>
    </div>
  );
}