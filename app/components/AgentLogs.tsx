"use client";
import { useEffect, useState } from "react";

export default function AgentLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/logs")
        .then((res) => res.json())
        .then((json) => {
          if (!cancelled) setLogs(Array.isArray(json) ? json : []);
        })
        .catch((err) => {
          if (!cancelled) setError(err);
        });
    load();
    const id = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (error)
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <p className="text-red-400 text-sm">Failed to load logs.</p>
      </div>
    );

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 max-h-96 overflow-y-auto">
      {logs.length === 0 ? (
        <p className="text-gray-400 text-sm">No agent logs yet.</p>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="text-sm flex items-start gap-2">
              <span
                className={`shrink-0 rounded px-1.5 text-xs font-semibold ${
                  log.level === "error"
                    ? "bg-red-900/50 text-red-300"
                    : log.level === "warn"
                    ? "bg-yellow-900/50 text-yellow-300"
                    : "bg-blue-900/50 text-blue-300"
                }`}
              >
                {log.level}
              </span>
              <span className="text-gray-400 shrink-0 text-xs">
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
              <span className="text-gray-200">{log.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}