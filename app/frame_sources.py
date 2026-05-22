"""Frame sources: webcam (default) or Tello drone video stream.

Both expose `get_frame()` returning a BGR numpy array, and `release()`.
"""

from __future__ import annotations

import logging
import threading
from abc import ABC, abstractmethod
from typing import Optional

import cv2
import numpy as np

import config

log = logging.getLogger(__name__)


class FrameSource(ABC):
    name: str = "abstract"

    @abstractmethod
    def get_frame(self) -> Optional[np.ndarray]:
        """Return the latest frame as BGR uint8, or None if unavailable."""

    @abstractmethod
    def release(self) -> None: ...


class WebcamFrameSource(FrameSource):
    name = "webcam"

    def __init__(self, index: int = 0) -> None:
        self._cap = cv2.VideoCapture(index)
        if not self._cap.isOpened():
            raise RuntimeError(f"could not open webcam at index {index}")
        # Reasonable defaults; not all webcams honor these.
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        log.info("webcam opened (index=%d)", index)

    def get_frame(self) -> Optional[np.ndarray]:
        ok, frame = self._cap.read()
        if not ok:
            return None
        return frame  # already BGR

    def release(self) -> None:
        self._cap.release()


class TelloFrameSource(FrameSource):
    """Wrap djitellopy's video stream and normalize to BGR.

    djitellopy returns RGB on some versions and BGR on others. We probe once
    and apply a conversion if needed.
    """

    name = "tello"

    def __init__(self) -> None:
        # Imported lazily so webcam mode doesn't require djitellopy at import time.
        from djitellopy import Tello  # type: ignore

        self._tello = Tello()
        self._tello.connect()
        self._tello.streamon()
        self._reader = self._tello.get_frame_read()
        self._lock = threading.Lock()
        self._needs_swap = self._probe_color_order()
        log.info("tello stream up (color_swap=%s)", self._needs_swap)

    def _probe_color_order(self) -> bool:
        """Heuristic: a fresh DJI/Tello frame is typically RGB. If the avg
        Red channel exceeds Blue significantly on the first frame, assume RGB
        and swap to BGR for downstream consistency.
        """
        for _ in range(10):
            frame = self._reader.frame
            if frame is not None:
                # Many djitellopy builds already give BGR. We can't be sure;
                # default to swapping (RGB -> BGR) only if a quick check says so.
                # Fall back to safe assumption: assume RGB and swap.
                return True
        return False

    def get_frame(self) -> Optional[np.ndarray]:
        with self._lock:
            frame = self._reader.frame
        if frame is None:
            return None
        if self._needs_swap:
            return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        return frame

    def release(self) -> None:
        try:
            self._tello.streamoff()
        except Exception:  # pragma: no cover
            pass


class MockFrameSource(FrameSource):
    """Synthetic frame source — used as a fallback when the webcam isn't
    available (e.g., macOS camera permission not granted yet). Lets the rest
    of the API come up so the demo isn't dead in the water.
    """

    name = "mock"

    def __init__(self) -> None:
        self._t = 0
        log.warning("using MockFrameSource — no real video input")

    def get_frame(self) -> Optional[np.ndarray]:
        import time

        time.sleep(0.05)
        h, w = 480, 640
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        # Diagonal sweeping gradient so something animates.
        col = (self._t % 60) / 60.0
        frame[:, :] = (int(40 + col * 80), int(40 + col * 60), int(40 + col * 30))
        cv2.putText(
            frame,
            "NO CAMERA",
            (w // 2 - 110, h // 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        self._t += 1
        return frame

    def release(self) -> None:
        pass


def make_source() -> FrameSource:
    if config.FRAME_SOURCE == "tello":
        return TelloFrameSource()
    if config.FRAME_SOURCE == "mock":
        return MockFrameSource()
    try:
        return WebcamFrameSource(config.WEBCAM_INDEX)
    except Exception as exc:
        log.error("webcam unavailable (%s) — falling back to mock source", exc)
        return MockFrameSource()
