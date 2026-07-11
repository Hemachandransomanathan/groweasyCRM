const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeRecord } = require("./crmSchema");

test("keeps a valid record with email", () => {
  const { record, valid } = sanitizeRecord({
    name: "John Doe",
    email: "john@example.com",
    crm_status: "GOOD_LEAD_FOLLOW_UP",
  });
  assert.equal(valid, true);
  assert.equal(record.email, "john@example.com");
  assert.equal(record.crm_status, "GOOD_LEAD_FOLLOW_UP");
});

test("keeps a valid record with mobile only", () => {
  const { valid } = sanitizeRecord({ name: "Jane", mobile_without_country_code: "9876543210" });
  assert.equal(valid, true);
});

test("flags a record with neither email nor mobile as invalid", () => {
  const { valid, reason } = sanitizeRecord({ name: "No Contact" });
  assert.equal(valid, false);
  assert.match(reason, /email/);
});

test("blanks an out-of-enum crm_status instead of trusting it", () => {
  const { record } = sanitizeRecord({
    email: "a@b.com",
    crm_status: "SOMETHING_MADE_UP",
  });
  assert.equal(record.crm_status, "");
});

test("blanks an out-of-enum data_source", () => {
  const { record } = sanitizeRecord({
    email: "a@b.com",
    data_source: "not_a_real_source",
  });
  assert.equal(record.data_source, "");
});

test("blanks an unparseable created_at", () => {
  const { record } = sanitizeRecord({ email: "a@b.com", created_at: "not-a-date" });
  assert.equal(record.created_at, "");
});

test("keeps a valid ISO-like created_at", () => {
  const { record } = sanitizeRecord({ email: "a@b.com", created_at: "2026-05-13 14:20:48" });
  assert.equal(record.created_at, "2026-05-13 14:20:48");
});

test("escapes raw newlines so the record stays a single CSV row", () => {
  const { record } = sanitizeRecord({ email: "a@b.com", crm_note: "line one\nline two" });
  assert.equal(record.crm_note, "line one\\nline two");
});
