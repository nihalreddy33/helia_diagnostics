import { SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Template Manager
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Maintain reusable findings and impressions that radiologists can
          pre-fill when reporting.
        </p>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Templates</h2>
        <SkeletonList rows={4} />
      </section>
    </div>
  );
}
