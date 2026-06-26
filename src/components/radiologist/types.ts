import type { Modality, ReportStatus } from "@/lib/types";

/** A draft report attached to a worklist patient (latest, non-approved). */
export type WorklistDraft = {
  id: string;
  status: ReportStatus;
  findings: string;
  impression: string;
  footer: string;
  templateId: string | null;
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
  draft: WorklistDraft | null;
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
