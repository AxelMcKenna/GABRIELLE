import type { Detection } from "../api";

type Props = {
  detections: Detection[];
};

export function DetectionsPanel({ detections }: Props) {
  return (
    <div className="bg-white border border-charcoal/10 rounded-[2px] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between bg-[#060607]">
        <span className="font-sans uppercase tracking-[0.2em] text-[9px] font-medium text-stone-100">
          Last frame · {detections.length} det
        </span>
      </div>
      <div className="px-3 py-2 space-y-1 max-h-32 overflow-y-auto">
        {detections.length === 0 ? (
          <div className="text-[10px] text-neutral-400 font-mono">no detections</div>
        ) : (
          detections.slice(0, 8).map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
              <span className="w-20 truncate text-charcoal">{d.label}</span>
              <div className="flex-1 h-1.5 bg-neutral-200 rounded overflow-hidden">
                <div
                  className="h-full bg-signal"
                  style={{ width: `${Math.min(100, d.confidence * 100)}%` }}
                />
              </div>
              <span className="w-10 text-right text-neutral-500">
                {(d.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
