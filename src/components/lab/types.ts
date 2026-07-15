import type { LabFlag, ReportStatus } from "@/lib/types";

export type LabResultRow = {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: LabFlag;
};

/** A pending lab order awaiting results. */
export type LabWorklistItem = {
  id: string; // lab report id
  status: ReportStatus;
  patientName: string;
  uhid: string;
  age: number;
  gender: string;
  orderedTest: string | null; // billed service name, if any
  templateId: string | null;
  results: LabResultRow[]; // pre-loaded from the ordered test's format
};
