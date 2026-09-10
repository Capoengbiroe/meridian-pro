export const dynamic = 'force-dynamic';
import ConfigForm from "../components/ConfigForm";
import PositionsTable from "../components/PositionsTable";
import DashboardOverview from "../components/DashboardOverview";
import AgentLogs from "../components/AgentLogs";

export default function Dashboard() {
  return (
    <div className="p-6">
      <DashboardOverview />

      <h2 className="text-2xl font-bold mt-8 mb-4">Agent Logs</h2>
      <AgentLogs />

      <h2 className="text-2xl font-bold mt-8 mb-4">Configuration</h2>
      <ConfigForm />

      <h2 className="text-2xl font-bold mt-8 mb-4">Open Positions</h2>
      <PositionsTable />
    </div>
  );
}