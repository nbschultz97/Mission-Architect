"""MCP server entrypoint for Architect Companion."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:  # pragma: no cover - offline test fallback
    class FastMCP:
        def __init__(self, _name: str) -> None:
            self._tools = []

        def tool(self):
            def decorator(func):
                self._tools.append(func)
                return func

            return decorator

        def run(self, transport: str = "stdio") -> None:
            raise RuntimeError(f"mcp package missing; cannot run transport={transport}")

from .catalog import get_blueprint, list_capabilities
from .storage import EventStore

mcp = FastMCP("architect-companion")
store = EventStore(Path(os.environ.get("ARCHITECT_COMPANION_DATA_DIR", "./runtime_data")))


@mcp.tool()
def health() -> Dict[str, str]:
    """Return server health and mission profile."""
    return {
        "status": "ok",
        "mode": "offline-first",
        "profile": "ceradon-architect-companion",
    }


@mcp.tool()
def list_capabilities_for_architect() -> List[Dict[str, str]]:
    """List capabilities exposed by this companion service."""
    return list_capabilities()


@mcp.tool()
def get_blueprint_for_architect(name: str = "architect-pose-overlay") -> Dict[str, Any]:
    """Fetch a named mission blueprint."""
    return get_blueprint(name)


@mcp.tool()
def record_observation(stream: str, payload: Dict[str, Any]) -> Dict[str, str]:
    """Persist a telemetry observation to local JSONL storage."""
    path = store.append(stream=stream, payload=payload)
    return {"status": "stored", "path": str(path)}


@mcp.tool()
def build_architect_payload(
    track_id: str,
    pose_keypoints: List[Dict[str, float]],
    confidence: float,
    source: str = "csi-pose-pipeline",
) -> Dict[str, Any]:
    """Create a normalized payload for Ceradon Architect ingestion."""
    if not 0.0 <= confidence <= 1.0:
        raise ValueError("confidence must be between 0.0 and 1.0")

    return {
        "schema": "architect.pose.v1",
        "source": source,
        "track_id": track_id,
        "confidence": confidence,
        "pose": {
            "format": "keypoints-2d",
            "keypoints": pose_keypoints,
        },
        "overlay_ready": True,
    }


@mcp.tool()
def propose_edge_pose_pipeline(
    chipset: str,
    compute_tier: str = "rpi5",
    fps_target: int = 8,
) -> Dict[str, Any]:
    """Generate low-power CSI pose pipeline guidance."""
    if compute_tier not in {"rpi4", "rpi5", "jetson-nano"}:
        raise ValueError("compute_tier must be one of: rpi4, rpi5, jetson-nano")

    quantized = compute_tier in {"rpi4", "jetson-nano"}
    model = "WiPose-lite-int8" if quantized else "WiPose-lite-fp16"

    return {
        "chipset": chipset,
        "compute_tier": compute_tier,
        "fps_target": fps_target,
        "pipeline": [
            "capture_csi",
            "denoise_and_phase_sanitize",
            "window_tensorize",
            f"infer:{model}",
            "skeleton_smoothing",
            "build_architect_payload",
        ],
        "tradeoffs": {
            "quantized_model": quantized,
            "latency_ms_estimate": 120 if quantized else 80,
            "power_bias": "edge-safe",
        },
    }


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
