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
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">System Activity</h3>
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
              <span className="text-sm text-green-400">ACTIVE</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">STANDING BY</span>
          )}
        </div>
      </div>

      <div className="flex items-end gap-1 h-24 mb-3">
        {stats.hourly.map((h) => (
          <div key={h.hour} className="flex flex-col items-center flex-1">
            <div
              className={`w-full rounded-t transition-all ${h.count > 0 ? "bg-blue-500" : "bg-gray-800"}`}
              style={{ height: `${Math.max((h.count / max) * 100, 4)}%` }}
              title={`${h.hour}:00 — ${h.count} event`}
            ></div>
            <span className="text-[9px] text-gray-500 mt-1">{h.hour}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>
          {stats.lastActivity
            ? `Terakhir: ${formatTime(stats.lastActivity)} (${minutesSince !== null ? `${minutesSince}m lalu` : "?"})`
            : "Belum ada aktivitas"}
        </span>
        <span>{stats.total24h} event / 24 jam</span>
      </div>
    </div>
  );
}