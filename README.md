# Architect MCP Server

Offline-first MCP server for **COTS robotics mission planning**, designed to complement the [Ceradon Architect](https://ceradonsystems.com) suite (COTS-Architect). Provides tools for unmanned systems (UxS) mission design, component selection, compatibility checking, and edge deployment configuration.

## Scope

- MCP tools over stdio for integration into Architect-adjacent workflows.
- COTS component catalog with compatibility checking for drone/robot builds.
- Mission blueprint generation for UxS operations.
- Flight time and endurance estimation based on platform configuration.
- Local append-only telemetry storage for disconnected edge nodes.
- Edge deployment configuration for constrained compute platforms.

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
architect-companion-mcp
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `health` | Server health check and mission profile status |
| `list_components` | Browse the COTS component catalog (filters by category) |
| `check_compatibility` | Verify compatibility between selected components |
| `generate_mission_blueprint` | Create a mission blueprint for a given UxS operation type |
| `estimate_flight_time` | Estimate flight time based on platform weight, battery, and payload |
| `recommend_configuration` | Get a recommended system configuration for a target compute tier |
| `record_observation` | Persist telemetry observations to local JSONL storage |

## Edge Deployment Notes

- Python 3.9+ target for Raspberry Pi 4/5 and Jetson Nano.
- Default storage path: `./runtime_data` (override with `ARCHITECT_COMPANION_DATA_DIR`).
- JSONL persistence avoids dependency-heavy database stacks in air-gapped environments.
- All tools operate fully offline — no cloud dependencies.
