export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];

export type CrmRecord = Record<CrmField, string>;

export interface SkippedRecord {
  record: CrmRecord;
  reason: string;
}

export interface FailedBatch {
  batchIndex: number;
  error: string;
  rowCount: number;
}

export interface ExtractResponse {
  sourceFile: string;
  sourceHeaders: string[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  failedBatches: FailedBatch[];
  imported: CrmRecord[];
  skipped: SkippedRecord[];
}

export type RawCsvRow = Record<string, string>;

export type Step = "upload" | "preview" | "processing" | "results";
