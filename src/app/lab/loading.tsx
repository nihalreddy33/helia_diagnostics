import { SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lab Worklist</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter and approve results for lab tests ordered at reception.
        </p>
      </header>
      <SkeletonList rows={4} />
    </div>
  );
}
