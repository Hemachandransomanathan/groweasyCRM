// Canonical GrowEasy CRM schema — single source of truth for the
// extraction prompt, validation, and CSV/JSON serialization.

const CRM_FIELDS = [
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
];

const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
];

const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
];

function emptyRecord() {
  return CRM_FIELDS.reduce((acc, field) => {
    acc[field] = "";
    return acc;
  }, {});
}

/**
 * Normalizes and validates a single AI-returned record against the schema.
 * Returns { record, valid, reason } — invalid records are still returned
 * (with reason) so the caller can decide whether to skip them.
 */
function sanitizeRecord(raw) {
  const record = emptyRecord();

  for (const field of CRM_FIELDS) {
    const value = raw?.[field];
    record[field] = value === null || value === undefined ? "" : String(value).trim();
  }

  // Enforce enum constraints — anything not in the allow-list is blanked
  // rather than trusted, per the assignment's "leave blank if unsure" rule.
  if (record.crm_status && !CRM_STATUS_VALUES.includes(record.crm_status)) {
    record.crm_status = "";
  }
  if (record.data_source && !DATA_SOURCE_VALUES.includes(record.data_source)) {
    record.data_source = "";
  }

  // created_at must be parseable by `new Date(...)` in JS.
  if (record.created_at && Number.isNaN(Date.parse(record.created_at))) {
    record.created_at = "";
  }

  // Collapse any accidental newlines so the record stays a single CSV row.
  for (const field of CRM_FIELDS) {
    if (record[field].includes("\n") || record[field].includes("\r")) {
      record[field] = record[field].replace(/\r\n|\r|\n/g, "\\n");
    }
  }

  const hasEmail = record.email.length > 0;
  const hasMobile = record.mobile_without_country_code.length > 0;

  if (!hasEmail && !hasMobile) {
    return { record, valid: false, reason: "Missing both email and mobile number" };
  }

  return { record, valid: true, reason: null };
}

module.exports = {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  emptyRecord,
  sanitizeRecord,
};
