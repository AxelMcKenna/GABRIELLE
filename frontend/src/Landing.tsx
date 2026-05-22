import { useNavigate } from "react-router-dom";
import { Sphere3D } from "./components/Sphere3D";

export function Landing() {
  const navigate = useNavigate();
  const onEnter = () => navigate("/coverage");
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#060607] text-stone-100 grid grid-cols-[1fr_1fr]">
      {/* LEFT */}
      <div className="relative flex flex-col px-20 py-16 z-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.4em] text-signal flex items-center gap-3">
          <span className="h-1.5 w-1.5 bg-signal" />
          Aerial Search Mesh
          <span className="h-3 w-px bg-white/20 mx-1" />
          <span className="text-white/55">Sector HBA-04</span>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-9 max-w-[34rem]">
          <h1
            className="font-sans font-thin uppercase leading-none tracking-[0.22em] text-stone-100"
            style={{ fontSize: "clamp(56px, 7.5vw, 108px)" }}
          >
            GABRIELLE
          </h1>

          <div className="space-y-3">
            <div className="flex items-center gap-5">
              <span className="h-px w-12 bg-white/30 shrink-0" />
              <p className="font-sans text-[15px] uppercase tracking-[0.18em] text-stone-300">
                New Zealand's first line of defence
              </p>
            </div>
            <p className="font-sans text-[13px] tracking-[0.04em] text-stone-400 max-w-[28rem] leading-relaxed pl-[68px]">
              An aerial mesh for visible-light search &amp; rescue — sweeping
              ground in a grey-to-red coverage map so humans can focus on the
              tiles that matter.
            </p>
          </div>

          <button onClick={onEnter} className="flex items-stretch group w-fit mt-1">
            <div className="h-14 w-14 bg-signal grid place-content-center overflow-hidden transition-transform group-hover:translate-x-1">
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                className="gabrielle-cta-arrow"
              >
                <path d="M3 11h16M13 5l6 6-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="square" />
              </svg>
            </div>
            <div className="h-14 px-6 border border-l-0 border-white/15 grid place-content-center group-hover:bg-white/5 transition-colors">
              <span className="font-sans uppercase tracking-[0.28em] text-[12px] font-medium text-stone-100">
                View Coverage
              </span>
            </div>
          </button>
        </div>

        <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
          v0.1 · Aotearoa
        </div>
      </div>

      {/* RIGHT */}
      <div className="relative flex items-center justify-center px-14 py-16 overflow-hidden">
        <div className="relative grid place-items-center">
          <div
            className="absolute pointer-events-none"
            style={{ width: "min(40vw, 640px)", height: "min(40vw, 640px)" }}
          >
            <Sphere3D particleColor="#dcdad4" linkColor="#9a978f" />
          </div>

          <div
            className="nz-mask relative z-[1]"
            style={{
              opacity: 0.95,
              width: "min(18vw, 240px)",
              height: "min(58vh, 440px)",
            }}
            aria-label="New Zealand"
          />
        </div>

        <div className="absolute bottom-16 right-16 font-mono text-[10px] uppercase tracking-[0.32em] text-white/55 text-right pointer-events-none">
          <div>Aotearoa · Mesh Live</div>
          <div className="text-white/35 mt-0.5">−41.2°S · 173.5°E</div>
        </div>
      </div>
    </div>
  );
}

