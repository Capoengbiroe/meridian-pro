export const dynamic = 'force-dynamic';
import ConfigForm from "../components/ConfigForm";
import PositionsTable from "../components/PositionsTable";
import DashboardOverview from "../components/DashboardOverview";
import AgentLogs from "../components/AgentLogs";
import SystemActivity from "../components/SystemActivity";

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <DashboardOverview />

      <SystemActivity />

      <h2 className="text-2xl font-bold">Agent Logs</h2>
      <AgentLogs />

      <h2 className="text-2xl font-bold">Configuration</h2>
      <ConfigForm />

      <h2 className="text-2xl font-bold">Open Positions</h2>
      <PositionsTable />
    </div>
  );
}