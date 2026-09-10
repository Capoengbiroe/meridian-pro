export const dynamic = 'force-dynamic';
import ConfigForm from "../components/ConfigForm";
import PositionsTable from "../components/PositionsTable";

export default function Dashboard() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Configuration</h2>
      <ConfigForm />

      <h2 className="text-2xl font-bold mt-8 mb-4">Open Positions</h2>
      <PositionsTable />
    </div>
  );
}