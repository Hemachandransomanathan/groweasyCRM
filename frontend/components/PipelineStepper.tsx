import { Step } from "@/lib/types";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "processing", label: "AI Mapping" },
  { key: "results", label: "Import" },
];

export default function PipelineStepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center w-full max-w-2xl mx-auto">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className={[
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono border transition-colors",
                  isDone
                    ? "bg-success/20 border-success text-success"
                    : isActive
                    ? "bg-accent/20 border-accent text-accent shadow-node"
                    : "bg-panel border-border text-muted",
                ].join(" ")}
              >
                {isDone ? "✓" : String(i + 1).padStart(2, "0")}
              </div>
              <span
                className={[
                  "text-[11px] font-mono tracking-wide uppercase whitespace-nowrap",
                  isActive ? "text-ink" : "text-muted",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-2 mb-5 relative overflow-hidden">
                <div className="absolute inset-0 border-t border-dashed border-border" />
                <div
                  style={{ transform: isDone ? "scaleX(1)" : "scaleX(0)" }}
                  className="absolute inset-0 border-t border-dashed border-accent origin-left transition-transform duration-500"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
