import { Prisma } from "@prisma/client";

/**
 * Everything needed to turn a lab format into a report's rows: its own
 * parameters plus, for a package, each member test's parameters in order.
 */
export const labTemplateWithMembers = Prisma.validator<Prisma.LabTemplateDefaultArgs>()({
  include: {
    parameters: { orderBy: { position: "asc" } },
    members: {
      orderBy: { position: "asc" },
      include: {
        member: {
          include: { parameters: { orderBy: { position: "asc" } } },
        },
      },
    },
  },
});

export type LabTemplateWithMembers = Prisma.LabTemplateGetPayload<typeof labTemplateWithMembers>;

/**
 * Split saved results into consecutive runs sharing a section, for rendering a
 * package report as one block per member test. A plain test's rows all carry an
 * empty section, so they come back as a single unnamed group.
 */
export function groupResults<T extends { section: string }>(
  results: T[],
): { section: string; items: T[] }[] {
  const groups: { section: string; items: T[] }[] = [];
  for (const r of results) {
    const last = groups[groups.length - 1];
    if (last && last.section === r.section) last.items.push(r);
    else groups.push({ section: r.section, items: [r] });
  }
  return groups;
}

/** A blank result row, tagged with the member test it came from. */
export type ExpandedRow = {
  name: string;
  unit: string;
  referenceRange: string;
  section: string;
};

/**
 * Flatten a lab format into the rows a technician fills in.
 *
 * A plain test yields its own parameters with no section, so the report stays
 * one ungrouped table. A package yields each member test's parameters tagged
 * with that test's name, which is what segregates the printed report.
 */
export function expandTemplate(tpl: LabTemplateWithMembers): ExpandedRow[] {
  const rows: ExpandedRow[] = [];

  for (const link of tpl.members) {
    for (const p of link.member.parameters) {
      rows.push({
        name: p.name,
        unit: p.unit,
        referenceRange: p.referenceRange,
        section: link.member.title,
      });
    }
  }

  // A package's own parameters (if it has any alongside members) become a
  // final section under its own name; a plain test's stay ungrouped.
  const ownSection = tpl.members.length > 0 ? tpl.title : "";
  for (const p of tpl.parameters) {
    rows.push({
      name: p.name,
      unit: p.unit,
      referenceRange: p.referenceRange,
      section: ownSection,
    });
  }

  return rows;
}
