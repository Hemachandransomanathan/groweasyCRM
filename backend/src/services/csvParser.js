const { parse } = require("csv-parse/sync");

/**
 * Parses a raw CSV buffer/string into an array of row objects, keyed by
 * whatever headers the source file actually has. We deliberately do NOT
 * assume or rename headers here — that mapping is the AI's job downstream.
 */
function parseCsv(fileContent) {
  let records;
  try {
    records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
  } catch (err) {
    const error = new Error(`Failed to parse CSV: ${err.message}`);
    error.status = 400;
    throw error;
  }

  if (!records.length) {
    const error = new Error("CSV file contains no data rows");
    error.status = 400;
    throw error;
  }

  const headers = Object.keys(records[0]);

  return { headers, rows: records };
}

module.exports = { parseCsv };
