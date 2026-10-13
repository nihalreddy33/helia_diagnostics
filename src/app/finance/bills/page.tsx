import { BillSearch } from "@/components/finance/BillSearch";

export const dynamic = "force-dynamic";

export default function FinanceBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  return (
    <BillSearch
      searchParams={searchParams}
      basePath="/finance/bills"
      billHref={(id) => `/finance/bills/${id}`}
    />
  );
}
