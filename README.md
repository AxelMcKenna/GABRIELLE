# GABRIELLE — Search-Area Coverage Demo (YOLO + Tello)

A small, offline-leaning demo: a **grey → yellow → red coverage map** driven by **local YOLO**
detections on a webcam (default) or a Tello drone stream. A simulated lawnmower "sweep" walks an
active cursor across a `GRID_ROWS × GRID_COLS` grid; while the cursor is on a tile, the strongest
detection there updates the tile's interest score (`max(class_weight × confidence)`), monotonically
heating from grey toward red.

This is a demo / proof-of-concept, framed for visible-light S&R. Humans decide; a grey tile never
means "confirmed empty."

## Setup (one-time, needs internet)

```bash
# 1) Python deps
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2) YOLO weights (cached after first run)
python scripts/download_weights.py

# 3) Frontend build
cd frontend
npm ci
npm run build
cd ..

# 4) (Optional) Mapbox token for the geospatial overlay.
#    Copy .env.example to .env.local and set VITE_MAPBOX_TOKEN.
#    Without a token, the demo falls back to a plain SVG grid (still works).
cp .env.example .env.local
```

## Run

```bash
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open <http://127.0.0.1:8000/> — FastAPI serves the built frontend; no Vite needed at runtime.

### Dev mode (optional)
Run Vite for HMR and FastAPI on a separate terminal; Vite proxies `/api` to `:8000`.

```bash
cd frontend && npm run dev          # terminal A
uvicorn app.main:app --reload       # terminal B
```

## Switching source

In `.env.local`:

```
FRAME_SOURCE=webcam   # default
# or
FRAME_SOURCE=tello
```

Tello mode adds `/api/drone/{connect,takeoff,land,emergency}` and surfaces drone controls in the UI.
Takeoff is blocked below 20% battery (`MIN_TAKEOFF_BATTERY`).

## Knobs

See `.env.example` for every option. Highlights:

- `MODEL_WEIGHTS=yolo11n.pt` — nano = fastest
- `DEVICE=auto|cpu|mps` — `auto` times CPU vs MPS at startup and picks the faster
- `LIFE_CLASSES=person` (weight 1.0) — turns tiles red
- `INTEREST_CLASSES=backpack,handbag,suitcase` (weight 0.5) — turns tiles yellow
- `GRID_ROWS=6 GRID_COLS=8 SWEEP_INTERVAL_S=2.0`
- `DETECT_EVERY=2 IMGSZ=640` — drop `IMGSZ` to 320 if FPS is rough

## macOS camera permission

First time you run uvicorn on macOS, the OS will prompt to grant the terminal app access to the
camera. If you decline (or the prompt doesn't appear), the backend falls back to a `mock` source
so the rest of the demo still works — but the video feed will show "NO CAMERA" and no detections
will fire.

Grant access via **System Settings → Privacy & Security → Camera → Terminal (or your shell)**
and restart `uvicorn`. To force the mock source for headless testing, set `FRAME_SOURCE=mock`.

## Caveats

- **Visible-light only.** Trees, rooftops, fog, glare all hide people. Grey ≠ empty.
- **Simulated sweep.** Tile position is a lawnmower timer, not GPS. Base Tello has no GPS.
- **Mapbox tiles need network.** Without `VITE_MAPBOX_TOKEN`, the UI falls back to an offline SVG
  grid that shows the spectrum just as well. Detection + sweep work entirely offline once weights
  are cached.
- **Google Fonts**: `frontend/index.html` preloads DM Sans / JetBrains Mono via the Google Fonts
  CDN. Offline, the browser falls back to system fonts — no functional impact.

## Layout

```
LOCUS/
├── app/                # FastAPI backend
│   ├── main.py         # API + StaticFiles(frontend/dist)
│   ├── detector.py     # YOLO load / warmup / infer
│   ├── frame_sources.py
│   ├── grid.py         # sweep + tile state worker thread
│   └── drone.py
├── frontend/           # React + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── geo.ts
│   │   └── components/{GridMap,VideoFeed,DetectionsPanel,StatusBar,DroneControls}.tsx
│   └── dist/           # build output, served by FastAPI
├── scripts/download_weights.py
├── config.py
└── requirements.txt
```
