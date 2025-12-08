# ATAK / Tactical-App exports

Mission Architect now emits lightweight products that tactical mapping tools can ingest offline:

## GeoJSON overlay
- Generated from the MissionProject payload (`Export GeoJSON`).
- Points: `nodes`, `platforms`, `kits` with `properties` `{name, role, type, origin_tool}`.
- Lines: `mesh_links` as `LineString` features with `{id, from, to, quality, rf_band, origin_tool}`. Coordinates are pulled from referenced nodes/platforms when present.
- Suitable for rapid import into TAK/ATAK or other GIS tools as an overlay.

## CoT-like JSON stub
- Accessible in the **ATAK JSON Stub** textarea and via `Copy MissionProject JSON`.
- Structure:
```json
{
  "schema": "CoT-lite",
  "mission": {"id", "name", "unit", "ao", "timeframe", "altitudeBand", "temperatureBand"},
  "units": [
    {"id", "callsign", "role", "lat", "lon", "elev", "rf_band", "type", "origin_tool"}
  ],
  "links": [ {"id", "from", "to", "quality", "rf_band"} ]
}
```
- Designed as a JSON-friendly stub for TAK servers or companion apps to map onto full CoT XML.
- Includes `origin_tool` so downstream apps can style nodes from Node Architect vs UxS Architect differently.

## Access and handling
- Exports respect the MissionProject access gate; no further prompts after the initial access code.
- Everything is offline-first and works without network access beyond any existing map tiles.
- Missing coordinates are tolerated; the export simply omits those features.
