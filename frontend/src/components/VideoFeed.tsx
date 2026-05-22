import { useEffect, useState } from "react";

export function VideoFeed() {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <>
      <div className="bg-white border border-charcoal/10 rounded-[2px] overflow-hidden shadow-[0_1px_0_rgba(0,0,0,0.02)]">
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-white/10 bg-[#060607]">
          <span className="font-sans uppercase tracking-[0.2em] text-[9px] font-medium text-stone-100">
            Drone 1 · Live Feed
          </span>
          <div className="flex items-center gap-3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label="Expand live feed"
              className="text-stone-300 hover:text-stone-100 transition-colors p-1"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 6V2H6 M14 6V2H10 M2 10V14H6 M14 10V14H10"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="py-4 bg-white">
          <img
            src="/api/video_feed"
            alt="live detector feed"
            className="block w-[320px] h-[240px] object-cover bg-black mx-auto"
          />
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Drone 1 live feed"
        >
          <div
            className="relative bg-[#060607] border border-white/10 rounded-[3px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 flex items-center justify-between border-b border-white/10">
              <span className="font-sans uppercase tracking-[0.22em] text-[11px] font-medium text-stone-100">
                Drone 1 · Live Feed
              </span>
              <div className="flex items-center gap-4">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal animate-pulse" />
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  aria-label="Close"
                  className="text-stone-300 hover:text-stone-100 transition-colors p-1"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 3L13 13M13 3L3 13"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="square"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <img
              src="/api/video_feed"
              alt="live detector feed"
              className="block bg-black"
              style={{
                width: "min(92vw, 1280px)",
                height: "min(82vh, 720px)",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
