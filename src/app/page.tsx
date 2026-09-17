import { fetchAllBatches, fetchRecentLedgerActivity } from "@/lib/xrpl";
import DashboardShell from "./DashboardShell";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Dashboard() {
  let batches  = [] as Awaited<ReturnType<typeof fetchAllBatches>>;
  let activity = [] as Awaited<ReturnType<typeof fetchRecentLedgerActivity>>;

  try {
    [batches, activity] = await Promise.all([
      fetchAllBatches(),
      fetchRecentLedgerActivity(),
    ]);
  } catch {
    // Render empty state if XRPL is unreachable
  }

  return <DashboardShell batches={batches} activity={activity} />;
}
