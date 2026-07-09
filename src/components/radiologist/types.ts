import type { Modality, ReportStatus } from "@/lib/types";

/** The latest report attached to a worklist patient (draft or approved). */
export type WorklistReport = {
  id: string;
  status: ReportStatus;
  findings: string;
  impression: string;
  footer: string;
  templateId: string | null;
  /** ISO timestamp of approval, present once approved. */
  approvedAt: string | null;
  /** ISO timestamp of the last content edit (draft, approval, or amendment). */
  lastEditedAt: string | null;
};

/** Plain, serializable patient row for the radiologist queue. */
export type WorklistPatient = {
  id: string;
  uhid: string;
  name: string;
  age: number;
  gender: string;
  /** Scan ordered via billing for the active report, if any. */
  orderedService: string | null;
  report: WorklistReport | null;
};

/** Plain, serializable template option used by the editor dropdown. */
export type WorklistTemplate = {
  id: string;
  title: string;
  modality: Modality;
  defaultFindings: string;
  defaultImpression: string;
  defaultFooter: string;
};
