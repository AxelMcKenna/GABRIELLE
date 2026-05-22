"""Single source of truth for runtime configuration.

Values come from environment variables (loaded by python-dotenv from .env or
.env.local at the repo root). All keys have sensible defaults so the demo runs
without configuration.
"""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")


def _env_str(name: str, default: str) -> str:
    return os.environ.get(name, default).strip()


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    return int(raw) if raw not in (None, "") else default


def _env_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    return float(raw) if raw not in (None, "") else default


def _env_list(name: str, default: list[str]) -> list[str]:
    raw = os.environ.get(name)
    if raw in (None, ""):
        return list(default)
    return [item.strip() for item in raw.split(",") if item.strip()]


FRAME_SOURCE: Literal["webcam", "tello"] = _env_str("FRAME_SOURCE", "webcam")  # type: ignore[assignment]
MODEL_WEIGHTS = _env_str("MODEL_WEIGHTS", "yolo11n.pt")
DEVICE: Literal["auto", "cpu", "mps"] = _env_str("DEVICE", "auto")  # type: ignore[assignment]

CONF_THRESHOLD = _env_float("CONF_THRESHOLD", 0.4)
RED_CONF = _env_float("RED_CONF", 0.5)

LIFE_CLASSES = _env_list("LIFE_CLASSES", ["person"])
INTEREST_CLASSES = _env_list("INTEREST_CLASSES", ["backpack", "handbag", "suitcase"])

GRID_ROWS = _env_int("GRID_ROWS", 6)
GRID_COLS = _env_int("GRID_COLS", 8)
SWEEP_INTERVAL_S = _env_float("SWEEP_INTERVAL_S", 2.0)

DETECT_EVERY = _env_int("DETECT_EVERY", 2)
IMGSZ = _env_int("IMGSZ", 640)
WARMUP_ITERS = _env_int("WARMUP_ITERS", 3)

MIN_TAKEOFF_BATTERY = _env_int("MIN_TAKEOFF_BATTERY", 20)

WEBCAM_INDEX = _env_int("WEBCAM_INDEX", 0)
JPEG_QUALITY = _env_int("JPEG_QUALITY", 75)
MJPEG_FPS_CAP = _env_int("MJPEG_FPS_CAP", 30)

FRONTEND_DIST = ROOT / "frontend" / "dist"


@lru_cache(maxsize=None)
def class_weight(label: str) -> float:
    """1.0 for LIFE_CLASSES, 0.5 for INTEREST_CLASSES, else 0.0."""
    if label in LIFE_CLASSES:
        return 1.0
    if label in INTEREST_CLASSES:
        return 0.5
    return 0.0


def is_tello() -> bool:
    return FRAME_SOURCE == "tello"
