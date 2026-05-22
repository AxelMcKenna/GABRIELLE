import type { Status } from "../api";

type Props = {
  status: Status | null;
  onReset: () => void;
};

export function StatusBar({ status, onReset }: Props) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white border border-charcoal/10 rounded-[2px] text-charcoal">
      <Stat label="Source" value={status?.frame_source ?? "—"} />
      <Divider />
      <Stat label="Device" value={status?.device ?? "—"} />
      <Divider />
      <Stat label="FPS" value={status ? status.fps.toFixed(1) : "—"} />
      {status?.frame_source === "tello" && (
        <>
          <Divider />
          <Stat
            label="Battery"
            value={status.battery != null ? `${status.battery}%` : "—"}
            color={
              status.battery == null
                ? undefined
                : status.battery < 20
                ? "#e63946"
                : status.battery < 50
                ? "#b45309"
                : "#047857"
            }
          />
        </>
      )}
      <div className="flex-1" />
      <button
        onClick={onReset}
        className="h-display text-[10px] tracking-[0.18em] px-3 py-1.5 rounded-[2px] bg-charcoal text-white hover:bg-charcoal-700 transition-colors"
      >
        Reset Grid
      </button>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-sans uppercase tracking-[0.32em] text-[8px] font-medium text-neutral-500">
        {label}
      </span>
      <span
        className="font-mono text-[11px] font-medium"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-7 w-px bg-charcoal/10" />;
}
