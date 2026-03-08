"""MCP server entrypoint for Architect MCP — COTS robotics mission planning."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

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

from .catalog import check_compatibility, get_blueprint, list_components
from .storage import EventStore

mcp = FastMCP("architect-mcp")
store = EventStore(Path(os.environ.get("ARCHITECT_COMPANION_DATA_DIR", "./runtime_data")))


@mcp.tool()
def health() -> Dict[str, str]:
    """Return server health and mission profile."""
    return {
        "status": "ok",
        "mode": "offline-first",
        "profile": "ceradon-cots-architect",
    }


@mcp.tool()
def list_cots_components(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Browse the COTS component catalog. Optionally filter by category
    (flight_controller, gps, power, telemetry, datalink, sensor, companion_computer)."""
    return list_components(category)


@mcp.tool()
def check_component_compatibility(component_slugs: List[str]) -> Dict[str, Any]:
    """Check whether a set of COTS components are mutually compatible.
    Pass a list of component slugs from the catalog."""
    return check_compatibility(component_slugs)


@mcp.tool()
def generate_mission_blueprint(mission_type: str = "recon-multirotor") -> Dict[str, Any]:
    """Generate a mission blueprint for a UxS operation.
    Available types: recon-multirotor, perimeter-patrol, mapping-survey."""
    return get_blueprint(mission_type)


@mcp.tool()
def estimate_flight_time(
    battery_mah: int,
    platform_weight_g: int,
    payload_weight_g: int = 0,
    avg_current_draw_a: float = 15.0,
) -> Dict[str, Any]:
    """Estimate flight time based on battery capacity, platform weight, and payload.
    Returns estimated endurance in minutes with safety margins."""
    total_weight_g = platform_weight_g + payload_weight_g
    # Simple endurance model: capacity / draw, with weight penalty
    weight_factor = 1.0 + (payload_weight_g / max(platform_weight_g, 1)) * 0.3
    effective_draw = avg_current_draw_a * weight_factor
    raw_minutes = (battery_mah / 1000.0) / effective_draw * 60.0
    safe_minutes = raw_minutes * 0.8  # 20% reserve

    return {
        "total_weight_g": total_weight_g,
        "battery_mah": battery_mah,
        "avg_current_draw_a": round(effective_draw, 2),
        "raw_endurance_min": round(raw_minutes, 1),
        "safe_endurance_min": round(safe_minutes, 1),
        "reserve_pct": 20,
        "note": "Estimates assume hover; forward flight may vary ±15%.",
    }


@mcp.tool()
def recommend_configuration(
    compute_tier: str = "rpi5",
    mission_type: str = "recon-multirotor",
) -> Dict[str, Any]:
    """Recommend a COTS system configuration for a target compute tier and mission type.
    Compute tiers: rpi4, rpi5, jetson-nano."""
    if compute_tier not in {"rpi4", "rpi5", "jetson-nano"}:
        raise ValueError("compute_tier must be one of: rpi4, rpi5, jetson-nano")

    # Base recommendations by tier
    configs = {
        "rpi4": {
            "companion": "Raspberry Pi 4 (4GB)",
            "flight_controller": "Pixhawk 6C",
            "recommended_components": ["pixhawk6c", "here3_gps", "holybro_pm02", "rfd900x"],
            "vision_capable": False,
            "notes": "Limited compute — best for telemetry relay and basic scripting.",
        },
        "rpi5": {
            "companion": "Raspberry Pi 5 (8GB)",
            "flight_controller": "Pixhawk 6C",
            "recommended_components": ["pixhawk6c", "here3_gps", "holybro_pm02", "rfd900x", "rpi5_companion", "oak_d_lite"],
            "vision_capable": True,
            "notes": "Full onboard vision pipeline with OAK-D. Good balance of compute and power.",
        },
        "jetson-nano": {
            "companion": "NVIDIA Jetson Nano",
            "flight_controller": "CubePilot Orange+",
            "recommended_components": ["cube_orange", "here3_gps", "holybro_pm02", "herelink"],
            "vision_capable": True,
            "notes": "GPU-accelerated inference for real-time object detection and tracking.",
        },
    }

    config = configs[compute_tier]
    config["compute_tier"] = compute_tier
    config["mission_type"] = mission_type

    return config


@mcp.tool()
def record_observation(stream: str, payload: Dict[str, Any]) -> Dict[str, str]:
    """Persist a telemetry observation to local JSONL storage."""
    path = store.append(stream=stream, payload=payload)
    return {"status": "stored", "path": str(path)}


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
