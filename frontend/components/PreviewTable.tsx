import { RawCsvRow } from "@/lib/types";

interface Props {
  headers: string[];
  rows: RawCsvRow[];
  maxHeightClass?: string;
}

export default function PreviewTable({ headers, rows, maxHeightClass = "max-h-[420px]" }: Props) {
  return (
    <div className={`w-full overflow-auto rounded-lg border border-border ${maxHeightClass}`}>
      <table className="min-w-full border-collapse text-sm font-mono">
        <thead className="sticky top-0 z-10">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="bg-panelAlt text-left text-xs uppercase tracking-wide text-muted px-4 py-3 border-b border-border whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-panel even:bg-[#141821] hover:bg-accentSoft/40 transition-colors">
              {headers.map((h) => (
                <td key={h} className="px-4 py-2.5 border-b border-border/60 whitespace-nowrap text-ink/90">
                  {row[h] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
