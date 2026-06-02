import Link from "next/link";
import { getActiveRole } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/types";
import type { Role } from "@/lib/types";

const CARDS: Record<Role, { href: string; title: string; blurb: string }[]> = {
  RECEPTION: [
    {
      href: "/reception",
      title: "Patient Intake",
      blurb: "Register a patient and assign the scan they're here for.",
    },
  ],
  RADIOLOGIST: [
    {
      href: "/radiologist",
      title: "Reporting Interface",
      blurb: "Pick a patient, load a template, write findings, submit for review.",
    },
  ],
  ADMIN: [
    {
      href: "/admin",
      title: "Review Queue",
      blurb: "Review pending reports, make edits, and approve & lock.",
    },
    {
      href: "/archive",
      title: "Month-Wise Archive",
      blurb: "Browse approved reports organized by month.",
    },
  ],
};

export default async function HomePage() {
  const role = await getActiveRole();
  const cards = CARDS[role];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome to Helia Diagnostics
        </h1>
        <p className="mt-1 text-slate-600">
          You are currently acting as{" "}
          <span className="font-semibold text-brand-700">{ROLE_LABELS[role]}</span>. Use the
          role switcher in the header to explore other workflows.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow"
          >
            <h2 className="text-base font-semibold text-slate-900 group-hover:text-brand-700">
              {card.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{card.blurb}</p>
            <span className="mt-3 inline-block text-sm font-medium text-brand-600">
              Open →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
