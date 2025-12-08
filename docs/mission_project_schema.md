# MissionProject schema (Ceradon Mission Architect)

The **MissionProject** JSON file is the shared interchange format across the Ceradon Architect Stack. Mission Architect reads/writes this structure for offline planning, demo presets, and handoff to other tools. Every file MUST include:

```json
{
  "schema": "MissionProject",
  "schemaVersion": "1.1.0",
  "origin_tool": "mission",
  "meta": { ... },
  "mission": { ... },
  "nodes": [],
  "platforms": [],
  "mesh_links": [],
  "kits": [],
  "environment": { ... },
  "constraints": []
}
```

## Common fields
- `id` — stable identifier suitable for cross-tool references.
- `name` — human-readable label.
- `origin_tool` — which Architect tool produced the entity (`"mission"`, `"node"`, `"uxs"`, `"mesh"`, `"kit"`).
- `role` / `roleTags` — functional tags such as `recon`, `relay`, `pose-trial`.
- RF / power / battery — `rf_band`, `power_draw_watts`, `battery_wh`, `endurance_hours`.
- Geo — `lat`, `lon`, `elevation` (meters). Latitude/longitude should be decimal degrees.

## Top-level objects
### `meta`
Planner metadata for the current mission book:
- `name`, `durationHours`, `altitudeBand`, `temperatureBand`
- `savedMissions` (array of prior snapshots), `lastUpdated`

### `mission`
Mission plan persisted by Mission Architect:
- `missionMeta` — `name`, `classificationBanner`, `ao`, `unitOrDetachment`, `createdOn`, `createdBy`, `missionType`, `durationHours`, `altitudeBand`, `temperatureBand`
- `phases` — ordered list with `id`, `name`, `description`, `startCondition`, `endCondition`, `tasks[]`, `assetsUsed[]`, `emconConsiderations`
- `assets` — mission-scoped assets as originally imported; mirror into the type-specific arrays where applicable
- `assignments` — phase/role assignments
- `imports` — passthrough storage for upstream tool payloads (`nodes`, `platforms`, `mesh.links`, `kits`)
- `constraints` — `timeWindow`, `environment`, `rfConstraints`, `logisticsConstraints`, `successCriteria[]`, `riskNotes`

### `nodes[]`
Ground sensors, mesh relays, or other nodes. Each entry:
- `id`, `name`, `role`, `origin_tool`
- RF / power: `rf_band`, `power_draw_watts`, `battery_wh`
- Geo: `lat`, `lon`, `elevation`
- Optional: `owner`, `notes`

### `platforms[]`
UxS or other mobile platforms:
- `id`, `name`, `role`, `origin_tool`
- `rf_band`, `endurance_hours`, `battery_wh`, `power_draw_watts`
- Geo seeds: `lat`, `lon`, `elevation`

### `mesh_links[]`
Connectivity graph edges:
- `id`, `from`, `to` (reference `nodes`/`platforms` ids)
- `quality` (e.g., `Strong`, `Marginal`, `Unlikely`), `rf_band`, optional `frequency`, `notes`

### `kits[]`
Payload and sustainment kits:
- `id`, `name`, `contents`
- `battery_wh`, `power_draw_watts` (if the kit includes powered items)
- Optional `lat`, `lon`, `elevation` for cache points

### `environment`
Operational envelope shared across tools:
- `ao`, `altitudeBand`, `temperatureBand`, `elevationRef`
- `weather` (narrative), `logisticsNotes`

### `constraints[]`
Structured constraint list:
- `id`, `type` (`time`, `environment`, `rf`, `logistics`, `risk`, `success-criteria`), `description`, `severity`

## Partial data handling
Imports from other Architect tools may omit sections (e.g., no kits yet). Parsers must accept missing arrays and keep placeholder IDs stable where present. Unknown fields are preserved but ignored by Mission Architect rendering.
