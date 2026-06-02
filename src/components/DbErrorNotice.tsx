export function DbErrorNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
      <p className="font-semibold">Database unavailable</p>
      <p className="mt-1 text-amber-800">
        Could not reach PostgreSQL. Make sure <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> is set,
        then run <code className="rounded bg-amber-100 px-1">npm run db:push</code> and{" "}
        <code className="rounded bg-amber-100 px-1">npm run db:seed</code>.
      </p>
    </div>
  );
}
