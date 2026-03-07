"""Ceradon Architect companion capability catalog."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Dict, List


@dataclass(frozen=True)
class Capability:
    slug: str
    name: str
    category: str
    summary: str
    priority: str


CAPABILITIES: List[Capability] = [
    Capability(
        slug="csi_capture",
        name="WiFi CSI Capture",
        category="sensor_ingest",
        summary="Capture CSI from Intel 5300/AX210/ESP32 for wall-penetrating sensing.",
        priority="core",
    ),
    Capability(
        slug="pose_inference",
        name="Human Pose Inference",
        category="inference",
        summary="Estimate skeletal keypoints from CSI tensors on constrained edge devices.",
        priority="core",
    ),
    Capability(
        slug="architect_export",
        name="Architect Export Adapter",
        category="integration",
        summary="Normalize observations into payloads that can be consumed by Ceradon Architect pipelines.",
        priority="core",
    ),
    Capability(
        slug="rssi_mobility",
        name="RSSI Mobility Detection",
        category="analytics",
        summary="Fallback occupancy/movement detection when CSI quality is degraded.",
        priority="support",
    ),
    Capability(
        slug="oui_enrichment",
        name="OUI Vendor Enrichment",
        category="enrichment",
        summary="Offline MAC-to-vendor resolution using cached OUI snapshots.",
        priority="support",
    ),
]


BLUEPRINTS: Dict[str, Dict[str, object]] = {
    "architect-pose-overlay": {
        "goal": "Feed through-wall pose detections into Ceradon Architect overlays.",
        "stages": [
            "csi_capture",
            "phase_sanitization",
            "pose_inference",
            "skeleton_tracking",
            "architect_export",
        ],
        "required_capabilities": ["csi_capture", "pose_inference", "architect_export"],
    },
    "architect-perimeter-watch": {
        "goal": "Low-power watch mode with movement cues and escalation to CSI pose pipeline.",
        "stages": ["rssi_scan", "mobility_detect", "csi_confirm", "architect_export"],
        "required_capabilities": ["rssi_mobility", "csi_capture", "architect_export"],
    },
}


def list_capabilities() -> List[Dict[str, str]]:
    return [asdict(cap) for cap in CAPABILITIES]


def get_blueprint(name: str) -> Dict[str, object]:
    return BLUEPRINTS[name]
