from architect_companion_mcp.catalog import check_compatibility, get_blueprint, list_components
from architect_companion_mcp.server import (
    estimate_flight_time,
    health,
    recommend_configuration,
)


def test_health_profile():
    result = health()
    assert result["status"] == "ok"
    assert result["profile"] == "ceradon-cots-architect"


def test_list_components_returns_all():
    components = list_components()
    assert len(components) > 0
    slugs = {c["slug"] for c in components}
    assert "pixhawk6c" in slugs
    assert "here3_gps" in slugs


def test_list_components_filter_by_category():
    fc = list_components(category="flight_controller")
    assert all(c["category"] == "flight_controller" for c in fc)
    assert len(fc) >= 2


def test_check_compatibility_pass():
    result = check_compatibility(["pixhawk6c", "here3_gps", "holybro_pm02"])
    assert result["compatible"] is True
    assert result["total_weight_g"] > 0


def test_check_compatibility_unknown():
    result = check_compatibility(["pixhawk6c", "nonexistent_part"])
    assert result["compatible"] is False
    assert "Unknown" in result["reason"]


def test_get_blueprint():
    bp = get_blueprint("recon-multirotor")
    assert bp["name"] == "recon-multirotor"
    assert "stages" in bp
    assert len(bp["stages"]) > 0


def test_estimate_flight_time():
    result = estimate_flight_time(
        battery_mah=5200,
        platform_weight_g=1500,
        payload_weight_g=200,
    )
    assert result["safe_endurance_min"] > 0
    assert result["reserve_pct"] == 20
    assert result["total_weight_g"] == 1700


def test_recommend_configuration_rpi5():
    config = recommend_configuration(compute_tier="rpi5", mission_type="recon-multirotor")
    assert config["vision_capable"] is True
    assert "pixhawk6c" in config["recommended_components"]
    assert config["compute_tier"] == "rpi5"
