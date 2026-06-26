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
  results: LabResultRow[]; // existing rows to resume a draft
};

/** A lab test format the technician can load into the results table. */
export type LabTemplateOption = {
  id: string;
  title: string;
  parameters: { name: string; unit: string; referenceRange: string }[];
};
