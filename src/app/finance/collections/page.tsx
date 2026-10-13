import { CollectionReport } from "@/components/finance/CollectionReport";

export const dynamic = "force-dynamic";

export default function FinanceCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  return (
    <CollectionReport
      searchParams={searchParams}
      basePath="/finance/collections"
      billHref={(id) => `/finance/bills/${id}`}
    />
  );
}
