import { FinanceDashboard } from "@/components/finance/FinanceDashboard";

export const dynamic = "force-dynamic";

export default function AdminFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  return <FinanceDashboard searchParams={searchParams} basePath="/admin/finance" />;
}
