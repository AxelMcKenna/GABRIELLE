"""FastAPI app: serves the built frontend and the YOLO/grid demo API."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

import config
from app.detector import Detector
from app.frame_sources import make_source
from app.grid import GridWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)
log = logging.getLogger("app.main")


state: dict = {"grid": None, "drone": None}


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("starting LOCUS — source=%s", config.FRAME_SOURCE)
    source = make_source()
    detector = Detector()
    grid = GridWorker(source, detector)
    grid.start()
    state["grid"] = grid

    if config.is_tello():
        from app.drone import DroneSession

        state["drone"] = DroneSession()

    try:
        yield
    finally:
        log.info("shutting down")
        if state["grid"]:
            state["grid"].stop()


app = FastAPI(lifespan=lifespan, title="LOCUS YOLO demo")


def _grid() -> GridWorker:
    g = state["grid"]
    if g is None:
        raise HTTPException(status_code=503, detail="grid not ready")
    return g


@app.get("/api/grid")
def get_grid() -> dict:
    return _grid().snapshot()


@app.get("/api/status")
def get_status() -> dict:
    g = _grid()
    out: dict = {**g.status(), "source": g._source.name, "frame_source": config.FRAME_SOURCE}
    drone = state["drone"]
    if drone is not None:
        out.update(drone.status())
    return out


@app.get("/api/detections")
def get_detections() -> dict:
    return {"detections": _grid().detections()}


@app.post("/api/grid/reset")
def reset_grid() -> dict:
    _grid().reset()
    return {"ok": True}


@app.get("/api/video_feed")
def video_feed() -> StreamingResponse:
    grid = _grid()
    boundary = "frame"
    frame_period = 1.0 / max(1, config.MJPEG_FPS_CAP)

    async def gen():
        while True:
            jpeg = grid.get_latest_jpeg()
            if jpeg:
                yield (
                    f"--{boundary}\r\n"
                    f"Content-Type: image/jpeg\r\n"
                    f"Content-Length: {len(jpeg)}\r\n\r\n"
                ).encode("ascii") + jpeg + b"\r\n"
            await asyncio.sleep(frame_period)

    return StreamingResponse(
        gen(),
        media_type=f"multipart/x-mixed-replace; boundary={boundary}",
    )


# ---- Drone endpoints (Tello mode only) -------------------------------------

def _drone():
    drone = state["drone"]
    if drone is None:
        raise HTTPException(status_code=404, detail="drone control not enabled (FRAME_SOURCE != tello)")
    return drone


@app.post("/api/drone/connect")
def drone_connect() -> dict:
    try:
        return _drone().connect()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/drone/takeoff")
def drone_takeoff() -> dict:
    try:
        return _drone().takeoff()
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/drone/land")
def drone_land() -> dict:
    try:
        return _drone().land()
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/drone/emergency")
def drone_emergency() -> dict:
    try:
        return _drone().emergency()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---- Static frontend -------------------------------------------------------
# Mount LAST so /api/* routes win.

if config.FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(config.FRONTEND_DIST), html=True),
        name="frontend",
    )
else:
    log.warning("frontend/dist not found — run `cd frontend && npm run build`")
