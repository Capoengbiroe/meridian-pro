"use client";
import { useEffect, useState } from "react";

export default function AgentLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = () =>
      fetch("/api/logs?limit=20")
        .then((res) => res.json())
        .then((json) => Array.isArray(json) && setLogs(json));
    
    fetchLogs();
    const id = setInterval(fetchLogs, 5000); // Polling lebih cepat
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-4 font-mono text-xs overflow-hidden">
      <h3 className="text-gray-500 mb-2 uppercase tracking-widest text-[10px]">Live System Stream</h3>
      <div className="h-64 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-800">
        {logs.length === 0 ? (
          <p className="text-gray-600">Waiting for agent activity...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2">
              <span className="text-gray-600">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
              <span className={`${log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-yellow-500' : 'text-blue-400'}`}>
                {log.agentType.toUpperCase()}
              </span>
              <span className="text-gray-300">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}