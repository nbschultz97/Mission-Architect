# Architect Companion MCP Server

This repository is a clean, offline-first MCP server intended to **complement Ceradon Architect** by providing UxS signal-intelligence tooling with WiFi CSI pose detection as the technical anchor.

## Scope

- MCP tools over stdio for integration into Architect-adjacent workflows.
- Pose-centric mission blueprints (through-wall skeletal inference pipeline).
- Local append-only telemetry storage for disconnected edge nodes.
- Payload normalizer for Architect-ready pose overlays.

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
architect-companion-mcp
```

## Available MCP tools

- `health`
- `list_capabilities_for_architect`
- `get_blueprint_for_architect`
- `record_observation`
- `build_architect_payload`
- `propose_edge_pose_pipeline`

## Edge deployment notes

- Python 3.9+ target for Raspberry Pi 4/5 and Jetson Nano.
- Default storage path: `./runtime_data` (override with `ARCHITECT_COMPANION_DATA_DIR`).
- JSONL persistence is used to avoid dependency-heavy database stacks in air-gapped environments.
