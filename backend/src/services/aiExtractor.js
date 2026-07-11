const Groq = require("groq-sdk");
const pLimit = require("p-limit");
const {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  sanitizeRecord,
} = require("../utils/crmSchema");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE || 25);
const CONCURRENCY = Number(process.env.AI_CONCURRENCY || 3);
const MAX_RETRIES = Number(process.env.AI_MAX_RETRIES || 3);

function buildSystemPrompt() {
  return `You are a data-mapping engine for the GrowEasy CRM. You receive raw CSV rows exported from arbitrary sources (Facebook Lead Ads, Google Ads, real-estate CRMs, sales reports, hand-built spreadsheets, etc.) with unpredictable, inconsistent, or ambiguous column names. Your job is to map each row's fields into the fixed GrowEasy CRM schema below, using semantic understanding of column names and values — not just exact string matches.

CRM SCHEMA (return exactly these keys for every record, using "" for anything not present or not confidently inferable):
${CRM_FIELDS.map((f) => `- ${f}`).join("\n")}

FIELD RULES:
1. crm_status: ONLY one of ${CRM_STATUS_VALUES.join(", ")}, or "" if nothing maps confidently. Infer from status/stage/disposition-like columns (e.g. "Hot Lead" -> GOOD_LEAD_FOLLOW_UP, "Not Interested" -> BAD_LEAD, "Closed Won"/"Converted" -> SALE_DONE, "No Answer"/"Unreachable" -> DID_NOT_CONNECT). Do not guess wildly — leave blank if there's no reasonable signal.
2. data_source: ONLY one of ${DATA_SOURCE_VALUES.join(", ")}, or "" if none match confidently. Never invent a new value.
3. created_at: must be a value parseable by JavaScript's \`new Date(created_at)\`. Prefer ISO-like "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD". If the source date is ambiguous or unparseable, leave "".
4. crm_note: use for remarks, follow-up notes, extra comments, AND any extra emails/phone numbers beyond the first one found (see rule 5). Combine multiple pieces of leftover info into one readable note, semicolon-separated.
5. Multiple emails/phones in a single row: use the FIRST email as "email" and FIRST phone as "mobile_without_country_code"; append any additional ones into crm_note (e.g. "Alt email: ...; Alt phone: ...").
6. mobile_without_country_code must contain digits only (no country code, spaces, dashes, or parentheses). country_code should be a "+" prefixed dialing code (e.g. "+91") if determinable, else "".
7. Never let any field value contain a raw newline — if you must represent a line break, use the literal characters \\n.
8. Only extract what's genuinely present or strongly implied by the row. Do not fabricate names, emails, companies, or notes.
9. Skip rule: if a row has NEITHER a usable email NOR a usable mobile number, still return it but set both "email" and "mobile_without_country_code" to "" — the caller will treat it as skipped. Do not drop rows from your output; return one CRM object per input row, in the same order.

OUTPUT FORMAT — CRITICAL:
Return ONLY a raw JSON object of the shape {"records": [ ... ]}, where "records" is an array with exactly one CRM object per input row, in the same order as input. No markdown fences, no prose, no explanation, no keys other than "records" at the top level and the schema fields inside each record. The array length MUST equal the number of input rows.`;
}

function buildUserPrompt(rows, sourceHeaders) {
  return `Source CSV headers: ${JSON.stringify(sourceHeaders)}

Map each of the following ${rows.length} rows into the GrowEasy CRM schema. Return a JSON object {"records": [...]} with exactly ${rows.length} objects, in the same order.

Rows:
${JSON.stringify(rows, null, 0)}`;
}

function extractRecordsArray(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Fallback: some models still wrap in markdown fences despite instructions.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) {
      throw new Error("Model response did not contain valid JSON");
    }
    parsed = JSON.parse(text.slice(start, end + 1));
  }

  if (Array.isArray(parsed)) return parsed; // in case the model returns a bare array anyway
  if (Array.isArray(parsed.records)) return parsed.records;

  throw new Error('Model response JSON did not contain a "records" array');
}

async function callGroqWithRetry(systemPrompt, userPrompt, batchIndex) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const text = completion.choices[0]?.message?.content || "";
      return extractRecordsArray(text);
    } catch (err) {
      lastErr = err;
      const backoffMs = 500 * 2 ** (attempt - 1);
      console.warn(
        `[aiExtractor] batch ${batchIndex} attempt ${attempt} failed: ${err.message}. ` +
          (attempt < MAX_RETRIES ? `Retrying in ${backoffMs}ms...` : "Giving up.")
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }
  }
  throw lastErr;
}

async function extractLeads(rows, headers, onProgress) {
  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  const limit = pLimit(CONCURRENCY);
  const systemPrompt = buildSystemPrompt();

  let completedBatches = 0;
  const results = await Promise.all(
    batches.map((batch, idx) =>
      limit(async () => {
        try {
          const userPrompt = buildUserPrompt(batch, headers);
          const raw = await callGroqWithRetry(systemPrompt, userPrompt, idx);

          if (!Array.isArray(raw)) {
            throw new Error("Model response was not a JSON array");
          }

          const sanitized = batch.map((_, i) => sanitizeRecord(raw[i] || {}));
          completedBatches += 1;
          if (onProgress) onProgress(completedBatches, batches.length);

          return { ok: true, batchIndex: idx, sanitized };
        } catch (err) {
          completedBatches += 1;
          if (onProgress) onProgress(completedBatches, batches.length);
          return {
            ok: false,
            batchIndex: idx,
            error: err.message,
            batchSize: batch.length,
          };
        }
      })
    )
  );

  const imported = [];
  const skipped = [];
  const failedBatches = [];

  for (const result of results) {
    if (!result.ok) {
      failedBatches.push({
        batchIndex: result.batchIndex,
        error: result.error,
        rowCount: result.batchSize,
      });
      continue;
    }
    for (const { record, valid, reason } of result.sanitized) {
      if (valid) {
        imported.push(record);
      } else {
        skipped.push({ record, reason });
      }
    }
  }

  return {
    imported,
    skipped,
    failedBatches,
    totalRows: rows.length,
    totalBatches: batches.length,
  };
}

module.exports = { extractLeads };