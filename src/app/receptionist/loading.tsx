import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="card space-y-4 p-6 lg:col-span-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-40" />
        </section>

        <section className="space-y-4 lg:col-span-2">
          <Skeleton className="h-4 w-36" />
          <SkeletonList rows={4} />
        </section>
      </div>
    </main>
  );
}
