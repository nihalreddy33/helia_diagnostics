import { CollectionReport } from "@/components/finance/CollectionReport";

export const dynamic = "force-dynamic";

export default function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  return (
    <CollectionReport
      searchParams={searchParams}
      basePath="/receptionist/collection"
      billHref={(id) => `/receptionist/billing/${id}`}
    />
  );
}
