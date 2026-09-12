"use client";
import { useEffect, useState } from "react";

export default function AgentLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = () =>
      fetch("/api/logs?limit=25")
        .then((res) => res.json())
        .then((json) => Array.isArray(json) && setLogs(json));

    fetchLogs();
    const id = setInterval(fetchLogs, 5000);
    return () => clearInterval(id);
  }, []);

  const levelColor = (level) => {
    switch (level) {
      case "error": return "text-red-400";
      case "warn": return "text-yellow-400";
      default: return "text-blue-400";
    }
  };
  const levelBg = (level) => {
    switch (level) {
      case "error": return "bg-red-950/60 border-red-900/40";
      case "warn": return "bg-yellow-950/40 border-yellow-900/40";
      default: return "bg-gray-900/70 border-gray-800";
    }
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-950/80 p-4 font-mono text-xs overflow-hidden">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
        <span className="text-gray-600 uppercase tracking-widest text-[10px] ml-2">live-stream</span>
      </div>
      <div className="h-72 overflow-y-auto space-y-1.5 scrollbar-thin">
        {logs.length === 0 ? (
          <p className="text-gray-600 animate-pulse">▊ Waiting for agent activity...</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`flex gap-2 rounded px-2 py-1 border ${levelBg(log.level)} transition-colors`}
            >
              <span className="text-gray-600 shrink-0">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
              <span className={`${levelColor(log.level)} font-semibold shrink-0 uppercase text-[10px] mt-0.5`}>
                {log.agentType}
              </span>
              <span className="text-gray-300 break-words">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}