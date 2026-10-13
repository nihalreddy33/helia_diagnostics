import { BillSearch } from "@/components/finance/BillSearch";

export const dynamic = "force-dynamic";

export default function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  return (
    <BillSearch
      searchParams={searchParams}
      basePath="/receptionist/bills"
      billHref={(id) => `/receptionist/billing/${id}`}
    />
  );
}
