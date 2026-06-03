import { SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-64 animate-pulse rounded-md bg-slate-200" />
      <SkeletonList rows={6} />
    </div>
  );
}
