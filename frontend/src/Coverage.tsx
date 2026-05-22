import { useEffect, useState } from "react";
import { api, type Detection, type GridSnapshot, type Status } from "./api";
import { GridMap } from "./components/GridMap";
import { VideoFeed } from "./components/VideoFeed";
import { DetectionsPanel } from "./components/DetectionsPanel";
import { StatusBar } from "./components/StatusBar";
import { DroneControls } from "./components/DroneControls";
import { DataSummary } from "./components/DataSummary";

export default function Coverage() {
  const [snapshot, setSnapshot] = useState<GridSnapshot | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const [g, s, d] = await Promise.all([api.grid(), api.status(), api.detections()]);
        if (cancelled) return;
        setSnapshot(g);
        setStatus(s);
        setDetections(d.detections);
      } catch {
        // backend not ready yet — ignore
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const pushLog = (text: string) =>
    setLog((l) =>
      [`${new Date().toLocaleTimeString("en-NZ", { hour12: false })} ${text}`, ...l].slice(0, 30)
    );

  const onReset = async () => {
    try {
      await api.resetGrid();
      pushLog("reset grid");
    } catch (err) {
      pushLog(`reset failed: ${err}`);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-200 text-charcoal font-sans overflow-hidden">
      <header className="shrink-0 bg-[#060607] border-b border-white/10 text-stone-100">
        <div className="w-full px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-5">
              <span className="block h-7 w-[2px] bg-signal" aria-hidden="true" />
              <div className="font-sans font-thin uppercase leading-none tracking-[0.22em] text-[26px] text-stone-100">
                GABRIELLE
              </div>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div className="font-sans uppercase tracking-[0.18em] text-[13px] text-stone-300">
              Search-Area Coverage · YOLO11 Nano
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-5 grid grid-cols-[340px_1fr] gap-5 overflow-hidden">
        <aside className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          <VideoFeed />
          <DataSummary snapshot={snapshot} />
          <DetectionsPanel detections={detections} />
          {status?.frame_source === "tello" && (
            <DroneControls status={status} onLog={pushLog} />
          )}
          {log.length > 0 && (
            <div className="bg-white border border-charcoal/10 rounded-[2px] p-3 max-h-40 overflow-y-auto">
              <div className="font-sans uppercase tracking-[0.32em] text-[9px] font-medium text-neutral-500 mb-2">
                Log
              </div>
              <div className="space-y-0.5 font-mono text-[10px]">
                {log.map((entry, i) => (
                  <div key={i} className="text-charcoal/70">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white/70 border border-charcoal/10 rounded-[2px] px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-neutral-500">
            Visible-light demo · grey ≠ confirmed empty
          </div>
        </aside>

        <section className="min-h-0 flex flex-col gap-4">
          <div className="flex-1 min-h-0 relative rounded-[3px] overflow-hidden border border-charcoal/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.02)]">
            <GridMap snapshot={snapshot} />
          </div>
          <StatusBar status={status} onReset={onReset} />
        </section>
      </main>
    </div>
  );
}
