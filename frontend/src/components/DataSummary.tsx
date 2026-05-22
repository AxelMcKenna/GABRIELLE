import type { GridSnapshot } from "../api";

type Props = { snapshot: GridSnapshot | null };

export function DataSummary({ snapshot }: Props) {
  const { scored, red, yellow, total } = summarize(snapshot);

  return (
    <div className="bg-white border border-charcoal/10 rounded-[2px] overflow-hidden">
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/10 bg-[#060607]">
        <span className="font-sans uppercase tracking-[0.2em] text-[9px] font-medium text-stone-100">
          Coverage Summary
        </span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-charcoal/10">
        <Cell label="Scored" value={`${scored}/${total}`} />
        <Cell label="Red" value={red} accent="text-rescue" />
        <Cell label="Yellow" value={yellow} accent="text-yellow-600" />
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="px-3 py-2 flex flex-col items-start gap-0.5">
      <span
        className={`font-mono text-[18px] leading-none tracking-tight ${accent ?? "text-charcoal"}`}
      >
        {value}
      </span>
      <span className="font-sans uppercase tracking-[0.2em] text-[9px] text-neutral-500">
        {label}
      </span>
    </div>
  );
}

function summarize(snapshot: GridSnapshot | null) {
  if (!snapshot) return { scored: 0, red: 0, yellow: 0, total: 0 };
  let scored = 0;
  let red = 0;
  let yellow = 0;
  for (const row of snapshot.tiles) {
    for (const t of row) {
      if (t.score > 0) {
        scored++;
        if (t.score >= 0.6) red++;
        else yellow++;
      }
    }
  }
  return { scored, red, yellow, total: snapshot.rows * snapshot.cols };
}
