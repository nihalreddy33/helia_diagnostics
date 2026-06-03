import { SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Destruction Override
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Loading records eligible for permanent deletion…
        </p>
      </header>
      {["Reports", "Patients", "Templates"].map((title) => (
        <section key={title} className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <SkeletonList rows={3} />
        </section>
      ))}
    </div>
  );
}
