import { SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          User Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Create staff accounts and manage their roles across the platform.
        </p>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">All users</h2>
        <SkeletonList rows={5} />
      </section>
    </div>
  );
}
