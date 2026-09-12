"use client";
import { useEffect, useState } from "react";

export default function WalletBalance() {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const fetchBalance = () =>
      fetch("/api/wallet")
        .then((res) => res.json())
        .then((data) => setBalance(data.balance))
        .catch(() => setBalance(0));

    fetchBalance();
    const id = setInterval(fetchBalance, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/70 p-4 backdrop-blur transition-all hover:border-gray-700">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-30" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Wallet</p>
          <span className="text-lg">💰</span>
        </div>
        <p className="mt-2 text-2xl font-bold text-white">
          {balance !== null ? `${balance.toFixed(4)}` : "..."}
        </p>
        <p className="text-xs text-gray-600">SOL Balance</p>
        <div className="mt-3 h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
            style={{ width: balance !== null ? `${Math.min(100, balance * 20)}%` : "0%" }}
          />
        </div>
      </div>
    </div>
  );
}