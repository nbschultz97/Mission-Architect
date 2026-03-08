"""COTS robotics component catalog and mission blueprints."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class Component:
    slug: str
    name: str
    category: str
    summary: str
    weight_g: int
    compatible_with: tuple


COMPONENTS: List[Component] = [
    Component(
        slug="pixhawk6c",
        name="Pixhawk 6C Flight Controller",
        category="flight_controller",
        summary="Open-source autopilot with PX4/ArduPilot support. Suitable for multi-rotor and fixed-wing UxS.",
        weight_g=40,
        compatible_with=("here3_gps", "holybro_pm02", "rfd900x", "herelink"),
    ),
    Component(
        slug="cube_orange",
        name="CubePilot Orange+",
        category="flight_controller",
        summary="Industrial-grade autopilot with triple-redundant IMUs and vibration isolation.",
        weight_g=76,
        compatible_with=("here3_gps", "holybro_pm02", "rfd900x", "herelink"),
    ),
    Component(
        slug="here3_gps",
        name="HERE3 GNSS Module",
        category="gps",
        summary="CAN-bus GNSS with RTK support. Centimeter-level positioning for precision missions.",
        weight_g=52,
        compatible_with=("pixhawk6c", "cube_orange", "holybro_pm02", "rfd900x", "herelink"),
    ),
    Component(
        slug="holybro_pm02",
        name="Holybro PM02 Power Module",
        category="power",
        summary="Voltage and current sensing power module for PX4-based autopilots.",
        weight_g=28,
        compatible_with=("pixhawk6c", "cube_orange", "here3_gps", "rfd900x", "herelink"),
    ),
    Component(
        slug="rfd900x",
        name="RFD900x Telemetry Radio",
        category="telemetry",
        summary="Long-range 900MHz telemetry with AES-128 encryption. Up to 40km range.",
        weight_g=15,
        compatible_with=("pixhawk6c", "cube_orange", "here3_gps", "holybro_pm02", "herelink"),
    ),
    Component(
        slug="herelink",
        name="HereLink HD Video + Control",
        category="datalink",
        summary="Integrated ground station with HD video downlink and joystick control.",
        weight_g=165,
        compatible_with=("pixhawk6c", "cube_orange", "here3_gps", "holybro_pm02", "rfd900x"),
    ),
    Component(
        slug="lidar_tf_luna",
        name="Benewake TF-Luna LiDAR",
        category="sensor",
        summary="Lightweight ToF LiDAR for altitude hold and obstacle avoidance. 8m range.",
        weight_g=5,
        compatible_with=("pixhawk6c", "cube_orange", "rpi5_companion"),
    ),
    Component(
        slug="rpi5_companion",
        name="Raspberry Pi 5 Companion Computer",
        category="companion_computer",
        summary="Edge compute for onboard vision, mission scripting, and MAVLink routing.",
        weight_g=45,
        compatible_with=("pixhawk6c", "cube_orange", "lidar_tf_luna", "oak_d_lite"),
    ),
    Component(
        slug="oak_d_lite",
        name="Luxonis OAK-D Lite",
        category="sensor",
        summary="Stereo depth camera with onboard neural inference for vision-based navigation.",
        weight_g=61,
        compatible_with=("rpi5_companion",),
    ),
]

COMPONENT_INDEX = {c.slug: c for c in COMPONENTS}


BLUEPRINTS: Dict[str, Dict[str, Any]] = {
    "recon-multirotor": {
        "goal": "ISR reconnaissance mission with live video downlink and autonomous waypoints.",
        "stages": [
            "pre_flight_check",
            "waypoint_planning",
            "autonomous_launch",
            "sensor_sweep",
            "video_downlink",
            "rtl_and_land",
        ],
        "required_components": ["flight_controller", "gps", "power", "datalink"],
        "optional_components": ["sensor", "companion_computer"],
    },
    "perimeter-patrol": {
        "goal": "Automated perimeter patrol with geofencing and anomaly detection.",
        "stages": [
            "geofence_load",
            "patrol_route_gen",
            "launch",
            "patrol_loop",
            "anomaly_flag",
            "rtl_on_low_battery",
        ],
        "required_components": ["flight_controller", "gps", "power", "telemetry"],
        "optional_components": ["sensor", "companion_computer"],
    },
    "mapping-survey": {
        "goal": "Photogrammetric mapping survey with overlap grid and GCP support.",
        "stages": [
            "area_definition",
            "grid_generation",
            "camera_config",
            "autonomous_survey",
            "image_capture",
            "post_processing",
        ],
        "required_components": ["flight_controller", "gps", "power", "sensor"],
        "optional_components": ["companion_computer", "datalink"],
    },
}


def list_components(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Return catalog components, optionally filtered by category."""
    result = []
    for comp in COMPONENTS:
        if category and comp.category != category:
            continue
        d = asdict(comp)
        d["compatible_with"] = list(comp.compatible_with)
        result.append(d)
    return result


def check_compatibility(component_slugs: List[str]) -> Dict[str, Any]:
    """Check whether a set of components are mutually compatible."""
    unknown = [s for s in component_slugs if s not in COMPONENT_INDEX]
    if unknown:
        return {"compatible": False, "reason": f"Unknown components: {', '.join(unknown)}"}

    issues = []
    for slug in component_slugs:
        comp = COMPONENT_INDEX[slug]
        others = [s for s in component_slugs if s != slug]
        for other in others:
            if other not in comp.compatible_with:
                issues.append(f"{comp.name} is not listed as compatible with {COMPONENT_INDEX[other].name}")

    return {
        "compatible": len(issues) == 0,
        "components": component_slugs,
        "issues": issues,
        "total_weight_g": sum(COMPONENT_INDEX[s].weight_g for s in component_slugs),
    }


def get_blueprint(name: str) -> Dict[str, Any]:
    """Fetch a named mission blueprint."""
    if name not in BLUEPRINTS:
        available = list(BLUEPRINTS.keys())
        raise KeyError(f"Blueprint '{name}' not found. Available: {available}")
    return {"name": name, **BLUEPRINTS[name]}
