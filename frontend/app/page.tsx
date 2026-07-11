"use client";

import { useCallback, useState } from "react";
import Papa from "papaparse";
import FileUpload from "@/components/FileUpload";
import PreviewTable from "@/components/PreviewTable";
import ResultsTable from "@/components/ResultsTable";
import ProcessingState from "@/components/ProcessingState";
import PipelineStepper from "@/components/PipelineStepper";
import StatCard from "@/components/StatCard";
import { extractLeads } from "@/lib/api";
import { ExtractResponse, RawCsvRow, Step } from "@/lib/types";

const PREVIEW_ROW_LIMIT = 50;

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawCsvRow[]>([]);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [resultsTab, setResultsTab] = useState<"imported" | "skipped">("imported");

  const resetAll = () => {
    setStep("upload");
    setFile(null);
    setUploadError(null);
    setHeaders([]);
    setRows([]);
    setTotalRowCount(0);
    setResult(null);
    setProcessingError(null);
    setResultsTab("imported");
  };

  const handleFileSelected = useCallback((selected: File) => {
    setUploadError(null);

    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setUploadError("That file doesn't look like a CSV. Please upload a .csv file.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setUploadError("File is larger than 5MB. Please upload a smaller CSV.");
      return;
    }

    // Parse client-side purely for preview — no AI processing happens here.
    Papa.parse<RawCsvRow>(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        if (parsed.errors.length > 0 && parsed.data.length === 0) {
          setUploadError("Couldn't parse this CSV. Check that it's a valid, comma-delimited file.");
          return;
        }
        const parsedHeaders = parsed.meta.fields || [];
        if (parsedHeaders.length === 0) {
          setUploadError("No columns found in this CSV.");
          return;
        }
        setFile(selected);
        setHeaders(parsedHeaders);
        setTotalRowCount(parsed.data.length);
        setRows(parsed.data.slice(0, PREVIEW_ROW_LIMIT));
        setStep("preview");
      },
      error: () => {
        setUploadError("Couldn't read this file. Please try again.");
      },
    });
  }, []);

  const handleConfirmImport = async () => {
    if (!file) return;
    setStep("processing");
    setProcessingError(null);
    try {
      const response = await extractLeads(file);
      setResult(response);
      setResultsTab("imported");
      setStep("results");
    } catch (err: any) {
      setProcessingError(err.message || "Something went wrong while importing.");
      setStep("preview");
    }
  };

  return (
    <main className="min-h-screen bg-canvas bg-grid">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-10">
          <div className="flex items-center gap-2 text-xs font-mono text-muted uppercase tracking-widest mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            GrowEasy CRM
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-ink">
            CSV Lead Importer
          </h1>
          <p className="text-muted mt-2 max-w-xl">
            Upload leads from any source — Facebook, Google Ads, spreadsheets, or a partner CRM.
            Claude maps the columns into GrowEasy&apos;s CRM schema automatically.
          </p>
        </header>

        <div className="mb-12">
          <PipelineStepper current={step} />
        </div>

        {step === "upload" && (
          <FileUpload onFileSelected={handleFileSelected} error={uploadError} />
        )}

        {step === "preview" && file && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg text-ink">{file.name}</p>
                <p className="text-sm text-muted font-mono">
                  {totalRowCount} row{totalRowCount === 1 ? "" : "s"} detected
                  {totalRowCount > PREVIEW_ROW_LIMIT ? ` · showing first ${PREVIEW_ROW_LIMIT}` : ""}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetAll}
                  className="px-4 py-2 rounded-md border border-border text-sm text-muted hover:text-ink hover:border-ink/40 transition-colors"
                >
                  Choose different file
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-5 py-2 rounded-md bg-accent text-canvas text-sm font-medium hover:brightness-110 transition-all"
                >
                  Confirm &amp; Import
                </button>
              </div>
            </div>

            {processingError && (
              <p className="text-sm text-danger font-mono" role="alert">
                {processingError}
              </p>
            )}

            <PreviewTable headers={headers} rows={rows} />
          </div>
        )}

        {step === "processing" && <ProcessingState rowCount={totalRowCount} />}

        {step === "results" && result && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-4">
              <StatCard label="Total Rows" value={result.totalRows} />
              <StatCard label="Imported" value={result.totalImported} tone="success" />
              <StatCard label="Skipped" value={result.totalSkipped} tone="warning" />
              {result.failedBatches.length > 0 && (
                <StatCard label="Failed Batches" value={result.failedBatches.length} tone="danger" />
              )}
            </div>

            {result.failedBatches.length > 0 && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger font-mono">
                {result.failedBatches.length} batch(es) failed after retries and were not imported.
                Re-upload the file to try again, or contact support with this file name: {result.sourceFile}
              </div>
            )}

            <div className="flex items-center gap-2 border-b border-border">
              <button
                onClick={() => setResultsTab("imported")}
                className={`px-4 py-2 text-sm font-mono border-b-2 -mb-px transition-colors ${
                  resultsTab === "imported" ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                Imported ({result.totalImported})
              </button>
              <button
                onClick={() => setResultsTab("skipped")}
                className={`px-4 py-2 text-sm font-mono border-b-2 -mb-px transition-colors ${
                  resultsTab === "skipped" ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                Skipped ({result.totalSkipped})
              </button>
            </div>

            {resultsTab === "imported" ? (
              <ResultsTable records={result.imported} emptyLabel="No records were imported." />
            ) : (
              <div className="flex flex-col gap-3">
                {result.skipped.length > 0 && (
                  <p className="text-xs text-muted font-mono">
                    Skipped rows had neither a usable email nor mobile number.
                  </p>
                )}
                <ResultsTable
                  records={result.skipped.map((s) => s.record)}
                  emptyLabel="Nothing was skipped — every row had an email or mobile number."
                />
              </div>
            )}

            <div>
              <button
                onClick={resetAll}
                className="px-4 py-2 rounded-md border border-border text-sm text-muted hover:text-ink hover:border-ink/40 transition-colors"
              >
                Import another file
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
