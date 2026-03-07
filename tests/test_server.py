from architect_companion_mcp.catalog import list_capabilities
from architect_companion_mcp.server import (
    build_architect_payload,
    health,
    propose_edge_pose_pipeline,
)


def test_health_profile():
    assert health()["profile"] == "ceradon-architect-companion"


def test_capabilities_include_architect_export():
    slugs = {item["slug"] for item in list_capabilities()}
    assert "architect_export" in slugs


def test_pipeline_quantization_for_rpi4():
    out = propose_edge_pose_pipeline(chipset="intel-5300", compute_tier="rpi4", fps_target=6)
    assert out["tradeoffs"]["quantized_model"] is True
    assert "infer:WiPose-lite-int8" in out["pipeline"]


def test_build_architect_payload_schema():
    payload = build_architect_payload(
        track_id="target-1",
        pose_keypoints=[{"x": 0.1, "y": 0.2, "score": 0.9}],
        confidence=0.87,
    )
    assert payload["schema"] == "architect.pose.v1"
    assert payload["overlay_ready"] is True
