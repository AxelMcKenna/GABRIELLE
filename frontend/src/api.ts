export type Tile = {
  score: number;
  label: string | null;
  conf: number | null;
};

export type GridSnapshot = {
  rows: number;
  cols: number;
  active: [number, number];
  tiles: Tile[][];
};

export type Status = {
  fps: number;
  device: string;
  source: string;
  frame_source: string;
  connected?: boolean;
  battery?: number | null;
  busy?: boolean;
};

export type Detection = {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  grid: () => fetch("/api/grid").then(json<GridSnapshot>),
  status: () => fetch("/api/status").then(json<Status>),
  detections: () =>
    fetch("/api/detections").then(json<{ detections: Detection[] }>),
  resetGrid: () =>
    fetch("/api/grid/reset", { method: "POST" }).then(json<{ ok: boolean }>),

  droneConnect: () =>
    fetch("/api/drone/connect", { method: "POST" }).then(json<unknown>),
  droneTakeoff: () =>
    fetch("/api/drone/takeoff", { method: "POST" }).then(json<unknown>),
  droneLand: () =>
    fetch("/api/drone/land", { method: "POST" }).then(json<unknown>),
  droneEmergency: () =>
    fetch("/api/drone/emergency", { method: "POST" }).then(json<unknown>),
};
