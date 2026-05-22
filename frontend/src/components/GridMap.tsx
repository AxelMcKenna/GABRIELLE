import { useEffect, useMemo, useRef } from "react";
import mapboxgl, { Map as MBMap, Marker } from "mapbox-gl";
import { gridParamsFor, type GridParams, type LngLat } from "../geo";
import type { GridSnapshot } from "../api";

function tileCenter(p: GridParams, row: number, col: number): [number, number] {
  const lng = p.minLng + (col + 0.5) * p.dLng;
  const lat = p.minLat + (p.rows - 1 - row + 0.5) * p.dLat;
  return [lng, lat];
}

function makeDroneEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "locus-drone";
  const color = "#1a1a1a";
  const rotor = (cx: number, cy: number) => `
    <g class="rotor" style="transform-origin:${cx}px ${cy}px">
      <circle cx="${cx}" cy="${cy}" r="7" fill="#fff" stroke="${color}" stroke-width="1.5" />
      <line x1="${cx - 6}" y1="${cy}" x2="${cx + 6}" y2="${cy}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
      <line x1="${cx}" y1="${cy - 6}" x2="${cx}" y2="${cy + 6}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
    </g>
  `;
  el.innerHTML = `
    <svg viewBox="0 0 48 48" width="40" height="40" class="drone-svg">
      <line x1="14" y1="14" x2="34" y2="34" stroke="${color}" stroke-width="2.5" />
      <line x1="34" y1="14" x2="14" y2="34" stroke="${color}" stroke-width="2.5" />
      <rect x="18" y="18" width="12" height="12" fill="${color}" />
      ${rotor(14, 14)}
      ${rotor(34, 14)}
      ${rotor(14, 34)}
      ${rotor(34, 34)}
    </svg>
  `;
  return el;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11";

const CENTER: LngLat = { lng: 176.8784, lat: -39.4928 };
const SIDE_M = 1000;

function buildGeoJSON(
  p: GridParams,
  grid: GridSnapshot | null
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const rows = p.rows;
  const cols = p.cols;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = grid?.tiles[r]?.[c];
      const score = tile?.score ?? 0;
      const label = tile?.label ?? "";
      const isActive = !!grid && grid.active[0] === r && grid.active[1] === c;
      const minLng = p.minLng + c * p.dLng;
      const minLat = p.minLat + (rows - 1 - r) * p.dLat;
      const maxLng = minLng + p.dLng;
      const maxLat = minLat + p.dLat;
      features.push({
        type: "Feature",
        properties: { row: r, col: c, score, label, active: isActive },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [minLng, minLat],
              [maxLng, minLat],
              [maxLng, maxLat],
              [minLng, maxLat],
              [minLng, minLat],
            ],
          ],
        },
      });
    }
  }
  return { type: "FeatureCollection", features };
}

type Props = {
  snapshot: GridSnapshot | null;
};

export function GridMap({ snapshot }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MBMap | null>(null);
  const droneRef = useRef<Marker | null>(null);
  const styleReady = useRef(false);

  const rows = snapshot?.rows ?? 6;
  const cols = snapshot?.cols ?? 8;
  const params = useMemo(() => gridParamsFor(CENTER, rows, cols, SIDE_M), [rows, cols]);

  useEffect(() => {
    if (!mapEl.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapEl.current,
      style: MAPBOX_STYLE,
      center: [CENTER.lng, CENTER.lat],
      zoom: 15.2,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => {
      styleReady.current = true;
      const droneEl = makeDroneEl();
      droneRef.current = new mapboxgl.Marker({ element: droneEl, anchor: "center" })
        .setLngLat([CENTER.lng, CENTER.lat])
        .addTo(map);
      map.addSource("grid", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "grid-fill",
        type: "fill",
        source: "grid",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "score"],
            0.0, "#2a2a2a",
            0.4, "#FFC72C",
            1.0, "#E63946",
          ] as any,
          "fill-opacity": [
            "case",
            ["==", ["get", "score"], 0],
            0.18,
            0.55,
          ] as any,
        },
      });
      map.addLayer({
        id: "grid-line",
        type: "line",
        source: "grid",
        paint: {
          "line-color": [
            "case",
            ["get", "active"], "#1a1a1a",
            "rgba(26,26,26,0.22)",
          ] as any,
          "line-width": [
            "case",
            ["get", "active"], 2.5,
            0.5,
          ] as any,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      droneRef.current = null;
      styleReady.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady.current) return;
    const src = map.getSource("grid") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(buildGeoJSON(params, snapshot));
    if (snapshot && droneRef.current) {
      const [lng, lat] = tileCenter(params, snapshot.active[0], snapshot.active[1]);
      droneRef.current.setLngLat([lng, lat]);
    }
  }, [params, snapshot]);

  if (!MAPBOX_TOKEN) {
    return <FallbackSvgGrid snapshot={snapshot} />;
  }

  return <div ref={mapEl} className="absolute inset-0" />;
}

function scoreToColor(score: number): string {
  // Match the Mapbox interpolate stops.
  const s = Math.max(0, Math.min(1, score));
  const lerp = (a: [number, number, number], b: [number, number, number], t: number) =>
    [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] as [
      number,
      number,
      number
    ];
  const grey: [number, number, number] = [42, 42, 42];
  const yellow: [number, number, number] = [250, 204, 21];
  const red: [number, number, number] = [230, 57, 70];
  const rgb = s <= 0.4 ? lerp(grey, yellow, s / 0.4) : lerp(yellow, red, (s - 0.4) / 0.6);
  return `rgb(${rgb.map(Math.round).join(",")})`;
}

function FallbackSvgGrid({ snapshot }: { snapshot: GridSnapshot | null }) {
  if (!snapshot) return <div className="absolute inset-0 bg-stone-100" />;
  const { rows, cols, tiles, active } = snapshot;
  return (
    <div className="absolute inset-0 bg-stone-100 flex items-center justify-center p-8">
      <div
        className="grid gap-1 w-full h-full max-w-5xl"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {Array.from({ length: rows }).flatMap((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const tile = tiles[r][c];
            const isActive = active[0] === r && active[1] === c;
            const opacity = tile.score === 0 ? 0.25 : 0.85;
            return (
              <div
                key={`${r}-${c}`}
                className={`rounded-[2px] relative ${isActive ? "ring-2 ring-white" : ""}`}
                style={{
                  background: scoreToColor(tile.score),
                  opacity,
                }}
                title={tile.label ? `${tile.label} · ${(tile.conf ?? 0).toFixed(2)}` : ""}
              >
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <FallbackDroneIcon />
                  </div>
                )}
                {tile.label && !isActive && (
                  <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-white/90">
                    {tile.label}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function FallbackDroneIcon() {
  return (
    <div className="locus-drone" style={{ width: 32, height: 32 }}>
      <svg viewBox="0 0 48 48" width="32" height="32" className="drone-svg">
        <line x1="14" y1="14" x2="34" y2="34" stroke="#1a1a1a" strokeWidth="2.5" />
        <line x1="34" y1="14" x2="14" y2="34" stroke="#1a1a1a" strokeWidth="2.5" />
        <rect x="18" y="18" width="12" height="12" fill="#1a1a1a" />
        {[
          [14, 14],
          [34, 14],
          [14, 34],
          [34, 34],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`} className="rotor" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <circle cx={cx} cy={cy} r="7" fill="#fff" stroke="#1a1a1a" strokeWidth="1.5" />
            <line
              x1={cx - 6}
              y1={cy}
              x2={cx + 6}
              y2={cy}
              stroke="#1a1a1a"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1={cx}
              y1={cy - 6}
              x2={cx}
              y2={cy + 6}
              stroke="#1a1a1a"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
