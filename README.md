# Mission Architect

Static single-page app for Ceradon Mission Architect, served via GitHub Pages with the custom domain `mission.ceradonsystems.com`.

## Mission planner highlights
- Mission metadata now includes duration (with 24/48/72 hr presets), altitude band, and temperature band. Metadata is stored under `missionMeta` and persisted in `localStorage`.
- Import Node/Platform/Mesh JSON exports directly from architect tools and keep them offline.
- Assign assets to phases/roles, flag critical dependencies, and mark tasks that require comms redundancy.
- Feasibility panel estimates sorties vs. endurance, counts critical platforms, and flags sustainment/comms risk.
- Generate printable mission cards plus GeoJSON overlays (ATAK-compatible) for assets with latitude/longitude.

## Hosting notes
- Pages expects `index.html` at the repository root; all site assets now live at the root to align with GitHub Pages.
- Custom domain is set via the `CNAME` file.

## Import formats
- **Node / Platform JSON**: arrays of objects with at minimum `name`. Optional fields honored: `id`, `roleTags`, `owner`, `notes`, `critical`, `enduranceHours` (or `enduranceMinutes` / `endurance`), `lat`/`lon` (or `latitude`/`longitude`).
- **Mesh JSON**: should include a `links` array with `from`, `to`, and `quality` (e.g., `Marginal`, `Unlikely`) so comms risk can be flagged for assignments marked "Needs Comms".

## Mission card and overlay export
- Add role assignments to generate per-team mission cards (print-friendly). Use the **Print / Save as PDF** control from the Mission Brief panel.
- Use **Export Mission Overlay** to download a GeoJSON file containing points for any assets with coordinates, ready for ATAK or other mapping tools.

## MissionProject schema and exports
- Mission Architect now reads/writes the shared **MissionProject** JSON schema (v1.1.0) used across the Architect Stack. See `docs/mission_project_schema.md`.
- Export controls produce full MissionProject bundles plus GeoJSON overlays and a CoT-like stub for ATAK-style ingest. Details in `docs/atak_exports.md`.
