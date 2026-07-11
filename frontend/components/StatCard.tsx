interface Props {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "warning" | "danger";
}

const TONE_CLASSES: Record<string, string> = {
  default: "text-ink",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export default function StatCard({ label, value, tone = "default" }: Props) {
  return (
    <div className="rounded-lg border border-border bg-panel px-5 py-4 flex flex-col gap-1 min-w-[140px]">
      <span className="text-xs uppercase tracking-wide text-muted font-mono">{label}</span>
      <span className={`font-display text-2xl font-semibold ${TONE_CLASSES[tone]}`}>{value}</span>
    </div>
  );
}
