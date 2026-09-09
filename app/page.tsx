import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meridian Pro — DLMM Liquidity Management Dashboard",
  description: "Autonomous Meteora DLMM liquidity management agent for Solana",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Meridian Pro
          </h1>
          <p className="text-gray-400 mt-4 text-lg">
            Autonomous Meteora DLMM Liquidity Management Agent
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-blue-400 font-semibold mb-2">Hunter Alpha</h3>
            <p className="text-gray-400 text-sm">
              Screens Meteora DLMM pools, evaluates candidates, and deploys into the best opportunities.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-purple-400 font-semibold mb-2">Healer Alpha</h3>
            <p className="text-gray-400 text-sm">
              Monitors open positions, manages risk, claims fees, and decides STAY/CLOSE/REDEPLOY.
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-green-400 font-semibold mb-2">Hive Mind</h3>
            <p className="text-gray-400 text-sm">
              Optional collective intelligence — shares lessons and strategy consensus with other agents.
            </p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total PnL</p>
              <p className="text-2xl font-bold text-green-400">+0.00 SOL</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Open Positions</p>
              <p className="text-2xl font-bold text-blue-400">0</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Unclaimed Fees</p>
              <p className="text-2xl font-bold text-yellow-400">0.00 SOL</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Status</p>
              <p className="text-2xl font-bold text-green-400">Idle</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}