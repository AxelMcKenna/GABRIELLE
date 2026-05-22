"""YOLO wrapper: device selection, warmup, inference, annotated output."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import List, Tuple

import numpy as np

import config

log = logging.getLogger(__name__)


@dataclass
class Detection:
    label: str
    confidence: float
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2


class Detector:
    def __init__(self) -> None:
        from ultralytics import YOLO  # type: ignore

        log.info("loading YOLO weights: %s", config.MODEL_WEIGHTS)
        self._model = YOLO(config.MODEL_WEIGHTS)
        self.device = self._resolve_device()
        log.info("using device: %s", self.device)
        self._warmup()

    def _resolve_device(self) -> str:
        if config.DEVICE in ("cpu", "mps"):
            return config.DEVICE
        # AUTO: time cpu vs mps on a small dummy frame; pick the fastest.
        dummy = np.zeros((config.IMGSZ, config.IMGSZ, 3), dtype=np.uint8)
        candidates = ["cpu"]
        try:
            import torch  # type: ignore

            if torch.backends.mps.is_available():
                candidates.append("mps")
        except Exception:
            pass
        best, best_t = "cpu", float("inf")
        for dev in candidates:
            try:
                t0 = time.perf_counter()
                self._model.predict(dummy, imgsz=config.IMGSZ, device=dev, verbose=False)
                dt = time.perf_counter() - t0
                log.info("device probe %s: %.1f ms", dev, dt * 1000)
                if dt < best_t:
                    best, best_t = dev, dt
            except Exception as exc:  # pragma: no cover
                log.warning("device %s unavailable: %s", dev, exc)
        return best

    def _warmup(self) -> None:
        dummy = np.zeros((config.IMGSZ, config.IMGSZ, 3), dtype=np.uint8)
        t0 = time.perf_counter()
        for _ in range(config.WARMUP_ITERS):
            self._model.predict(
                dummy,
                imgsz=config.IMGSZ,
                device=self.device,
                conf=config.CONF_THRESHOLD,
                verbose=False,
            )
        log.info(
            "warmup done (%d iters in %.0f ms)",
            config.WARMUP_ITERS,
            (time.perf_counter() - t0) * 1000,
        )

    def infer(self, frame_bgr: np.ndarray) -> Tuple[np.ndarray, List[Detection]]:
        result = self._model.predict(
            frame_bgr,
            imgsz=config.IMGSZ,
            device=self.device,
            conf=config.CONF_THRESHOLD,
            verbose=False,
        )[0]
        annotated = result.plot()  # BGR

        dets: List[Detection] = []
        names = result.names
        boxes = result.boxes
        if boxes is not None and len(boxes) > 0:
            xyxy = boxes.xyxy.cpu().numpy()
            confs = boxes.conf.cpu().numpy()
            cls_ids = boxes.cls.cpu().numpy().astype(int)
            for (x1, y1, x2, y2), conf, cid in zip(xyxy, confs, cls_ids):
                label = names.get(int(cid), str(cid)) if isinstance(names, dict) else names[int(cid)]
                dets.append(
                    Detection(
                        label=str(label),
                        confidence=float(conf),
                        bbox=(float(x1), float(y1), float(x2), float(y2)),
                    )
                )
        return annotated, dets
