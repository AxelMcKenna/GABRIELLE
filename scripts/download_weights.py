"""One-time online step: triggers the ultralytics YOLO weights download."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ultralytics import YOLO  # type: ignore  # noqa: E402

import config  # noqa: E402

if __name__ == "__main__":
    print(f"downloading {config.MODEL_WEIGHTS} ...")
    YOLO(config.MODEL_WEIGHTS)
    print("done.")
