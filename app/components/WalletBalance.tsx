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
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Wallet Balance</p>
      <p className="text-2xl font-bold text-white">
        {balance !== null ? `${balance.toFixed(4)} SOL` : "..."}
      </p>
    </div>
  );
}