import { useState } from "react";
import { api, type Status } from "../api";

type Props = {
  status: Status | null;
  onLog: (text: string) => void;
};

export function DroneControls({ status, onLog }: Props) {
  const [busy, setBusy] = useState(false);
  const wrap = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    onLog(`> ${label}`);
    try {
      await fn();
      onLog(`${label} ok`);
    } catch (err) {
      onLog(`${label} failed: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  };
  const lowBattery = status?.battery != null && status.battery < 20;

  return (
    <div className="bg-white border border-charcoal/10 rounded-[2px] p-3 space-y-2">
      <div className="font-sans uppercase tracking-[0.32em] text-[9px] font-medium text-neutral-500">
        Drone
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Btn disabled={busy} onClick={() => wrap("connect", api.droneConnect)}>
          Connect
        </Btn>
        <Btn
          disabled={busy || lowBattery || !status?.connected}
          onClick={() => wrap("takeoff", api.droneTakeoff)}
        >
          Takeoff
        </Btn>
        <Btn disabled={busy} onClick={() => wrap("land", api.droneLand)}>
          Land
        </Btn>
        <Btn
          disabled={busy}
          onClick={() => wrap("EMERGENCY", api.droneEmergency)}
          danger
        >
          Emergency
        </Btn>
      </div>
      {lowBattery && (
        <div className="text-[10px] text-rescue font-mono">
          battery below 20% — takeoff disabled
        </div>
      )}
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const base =
    "h-display text-[10px] tracking-[0.18em] px-3 py-2 rounded-[2px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const cls = danger
    ? "bg-rescue hover:bg-rescue-dark text-white"
    : "bg-stone-100 hover:bg-stone-200 text-charcoal";
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}
