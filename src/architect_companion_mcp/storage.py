"""Offline-first JSONL event storage for edge nodes."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict


@dataclass
class EventStore:
    root: Path

    def __post_init__(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)

    def append(self, stream: str, payload: Dict[str, Any]) -> Path:
        stream_path = self.root / f"{stream}.jsonl"
        record = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "stream": stream,
            "payload": payload,
        }
        with stream_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, separators=(",", ":")))
            handle.write("\n")
        return stream_path
