export default function ProcessingState({ rowCount }: { rowCount: number }) {
  return (
    <div className="w-full max-w-xl mx-auto rounded-xl border border-border bg-panel p-10 flex flex-col items-center gap-4 text-center">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div className="absolute inset-0 rounded-full border-2 border-t-accent border-r-accent border-b-transparent border-l-transparent animate-spin" />
      </div>
      <div>
        <p className="font-display text-lg text-ink">Mapping fields with GROQ</p>
        <p className="text-sm text-muted mt-1 font-mono">
          Batching {rowCount} row{rowCount === 1 ? "" : "s"} into the GrowEasy CRM schema…
        </p>
      </div>
    </div>
  );
}
