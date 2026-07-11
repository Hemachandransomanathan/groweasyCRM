import { CRM_FIELDS, CrmRecord } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  GOOD_LEAD_FOLLOW_UP: "bg-success/15 text-success border-success/30",
  DID_NOT_CONNECT: "bg-warning/15 text-warning border-warning/30",
  BAD_LEAD: "bg-danger/15 text-danger border-danger/30",
  SALE_DONE: "bg-accent/15 text-accent border-accent/30",
};

function StatusBadge({ status }: { status: string }) {
  if (!status) return <span className="text-muted text-xs">—</span>;
  const style = STATUS_STYLES[status] || "bg-panelAlt text-muted border-border";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-mono ${style}`}>
      {status}
    </span>
  );
}

interface Props {
  records: CrmRecord[];
  emptyLabel: string;
}

export default function ResultsTable({ records, emptyLabel }: Props) {
  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto rounded-lg border border-border max-h-[480px]">
      <table className="min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            {CRM_FIELDS.map((f) => (
              <th
                key={f}
                className="bg-panelAlt text-left text-xs uppercase tracking-wide text-muted px-4 py-3 border-b border-border whitespace-nowrap font-mono"
              >
                {f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record, i) => (
            <tr key={i} className="odd:bg-panel even:bg-[#141821] hover:bg-accentSoft/40 transition-colors">
              {CRM_FIELDS.map((f) => (
                <td key={f} className="px-4 py-2.5 border-b border-border/60 whitespace-nowrap font-mono text-ink/90">
                  {f === "crm_status" ? <StatusBadge status={record[f]} /> : record[f] || <span className="text-muted">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
