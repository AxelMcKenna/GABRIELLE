"""Sweep grid: tile state, lawnmower active cursor, worker thread."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from typing import List, Optional

import cv2
import numpy as np

import config
from app.detector import Detection, Detector
from app.frame_sources import FrameSource

log = logging.getLogger(__name__)


@dataclass
class Tile:
    score: float = 0.0
    label: Optional[str] = None
    conf: Optional[float] = None
    updated_at: Optional[float] = None


@dataclass
class DetectionDict:
    label: str
    confidence: float
    bbox: List[float] = field(default_factory=list)

    @classmethod
    def from_detection(cls, d: Detection) -> "DetectionDict":
        return cls(label=d.label, confidence=d.confidence, bbox=list(d.bbox))


def _lawnmower_order(rows: int, cols: int) -> List[tuple[int, int]]:
    path: List[tuple[int, int]] = []
    for r in range(rows):
        cs = range(cols) if r % 2 == 0 else range(cols - 1, -1, -1)
        for c in cs:
            path.append((r, c))
    return path


class GridWorker:
    def __init__(self, source: FrameSource, detector: Detector) -> None:
        self._source = source
        self._detector = detector
        self.rows = config.GRID_ROWS
        self.cols = config.GRID_COLS

        self._lock = threading.Lock()
        self._tiles: List[List[Tile]] = [
            [Tile() for _ in range(self.cols)] for _ in range(self.rows)
        ]
        self._path = _lawnmower_order(self.rows, self.cols)
        self._path_idx = 0
        self._active = self._path[0]
        self._last_advance = time.monotonic()

        self._last_jpeg: bytes = b""
        self._last_jpeg_lock = threading.Lock()
        self._last_detections: List[DetectionDict] = []

        self._fps = 0.0
        self._last_frame_t = time.monotonic()

        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    # ---- lifecycle ----------------------------------------------------------

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, daemon=True, name="grid-worker")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=2.0)
        self._source.release()

    # ---- public API ---------------------------------------------------------

    def reset(self) -> None:
        with self._lock:
            self._tiles = [[Tile() for _ in range(self.cols)] for _ in range(self.rows)]
            self._path_idx = 0
            self._active = self._path[0]
            self._last_advance = time.monotonic()

    def snapshot(self) -> dict:
        with self._lock:
            tiles = [
                [
                    {"score": t.score, "label": t.label, "conf": t.conf}
                    for t in row
                ]
                for row in self._tiles
            ]
            return {
                "rows": self.rows,
                "cols": self.cols,
                "active": list(self._active),
                "tiles": tiles,
            }

    def status(self) -> dict:
        return {
            "fps": round(self._fps, 1),
            "device": self._detector.device,
            "source": self._source.name,
        }

    def detections(self) -> List[dict]:
        return [
            {"label": d.label, "confidence": d.confidence, "bbox": d.bbox}
            for d in self._last_detections
        ]

    def get_latest_jpeg(self) -> bytes:
        with self._last_jpeg_lock:
            return self._last_jpeg

    # ---- worker -------------------------------------------------------------

    def _run(self) -> None:
        frame_idx = 0
        last_annotated: Optional[np.ndarray] = None
        while not self._stop.is_set():
            frame = self._source.get_frame()
            if frame is None:
                time.sleep(0.01)
                continue

            self._tick_sweep()
            self._tick_fps()

            if frame_idx % max(1, config.DETECT_EVERY) == 0:
                try:
                    annotated, dets = self._detector.infer(frame)
                except Exception as exc:  # pragma: no cover
                    log.exception("inference failed: %s", exc)
                    annotated, dets = frame, []
                last_annotated = annotated
                self._apply_detections(dets)
            elif last_annotated is None:
                last_annotated = frame

            self._encode_jpeg(last_annotated)
            frame_idx += 1

    def _tick_sweep(self) -> None:
        now = time.monotonic()
        if now - self._last_advance < config.SWEEP_INTERVAL_S:
            return
        with self._lock:
            self._path_idx = (self._path_idx + 1) % len(self._path)
            self._active = self._path[self._path_idx]
            self._last_advance = now

    def _tick_fps(self) -> None:
        now = time.monotonic()
        dt = now - self._last_frame_t
        if dt > 0:
            inst = 1.0 / dt
            self._fps = 0.9 * self._fps + 0.1 * inst if self._fps else inst
        self._last_frame_t = now

    def _apply_detections(self, dets: List[Detection]) -> None:
        self._last_detections = [DetectionDict.from_detection(d) for d in dets]
        if not dets:
            return
        weighted = [
            (config.class_weight(d.label) * d.confidence, d) for d in dets
        ]
        weighted = [w for w in weighted if w[0] > 0]
        if not weighted:
            return
        score, top = max(weighted, key=lambda x: x[0])
        with self._lock:
            r, c = self._active
            tile = self._tiles[r][c]
            if score > tile.score:
                tile.score = float(min(1.0, score))
                tile.label = top.label
                tile.conf = float(top.confidence)
                tile.updated_at = time.time()

    def _encode_jpeg(self, frame_bgr: np.ndarray) -> None:
        ok, buf = cv2.imencode(
            ".jpg",
            frame_bgr,
            [int(cv2.IMWRITE_JPEG_QUALITY), int(config.JPEG_QUALITY)],
        )
        if not ok:
            return
        with self._last_jpeg_lock:
            self._last_jpeg = buf.tobytes()
