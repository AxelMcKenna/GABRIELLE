"""Drone control endpoints for Tello mode.

A heartbeat thread keeps the connection alive and updates battery; one lock
serializes commands. Only instantiated when FRAME_SOURCE=tello.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Optional

import config

log = logging.getLogger(__name__)


class DroneSession:
    HEARTBEAT_SECONDS = 5

    def __init__(self) -> None:
        from djitellopy import Tello  # type: ignore

        self._lock = threading.Lock()
        self._drone = Tello()
        self._connected = False
        self._battery: Optional[int] = None
        self._busy = False
        threading.Thread(target=self._heartbeat, daemon=True).start()

    # ---- heartbeat ----------------------------------------------------------

    def _heartbeat(self) -> None:
        while True:
            if not self._busy and self._lock.acquire(blocking=False):
                try:
                    if not self._connected:
                        self._drone.connect()
                    self._battery = self._drone.get_battery()
                    self._connected = True
                except Exception:
                    self._connected = False
                    self._battery = None
                finally:
                    self._lock.release()
            time.sleep(self.HEARTBEAT_SECONDS)

    # ---- status -------------------------------------------------------------

    def status(self) -> dict:
        return {
            "connected": self._connected,
            "battery": self._battery,
            "busy": self._busy,
        }

    # ---- commands -----------------------------------------------------------

    def connect(self) -> dict:
        with self._lock:
            self._drone.connect()
            self._connected = True
            self._battery = self._drone.get_battery()
            return {"connected": True, "battery": self._battery}

    def takeoff(self) -> dict:
        if self._battery is not None and self._battery < config.MIN_TAKEOFF_BATTERY:
            raise RuntimeError(
                f"battery {self._battery}% below MIN_TAKEOFF_BATTERY ({config.MIN_TAKEOFF_BATTERY}%)"
            )
        if not self._lock.acquire(blocking=True, timeout=10):
            raise RuntimeError("drone is busy")
        self._busy = True
        try:
            if not self._connected:
                self._drone.connect()
                self._connected = True
            self._drone.takeoff()
            return {"ok": True}
        finally:
            self._busy = False
            self._lock.release()

    def land(self) -> dict:
        if not self._lock.acquire(blocking=True, timeout=10):
            raise RuntimeError("drone is busy")
        self._busy = True
        try:
            self._drone.land()
            return {"ok": True}
        finally:
            self._busy = False
            self._lock.release()

    def emergency(self) -> dict:
        # Skip the lock — emergency must always go through.
        try:
            self._drone.emergency()
        finally:
            self._busy = False
        return {"ok": True}
