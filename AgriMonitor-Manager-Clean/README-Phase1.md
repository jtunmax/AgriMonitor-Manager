# AgriMonitor Manager — Phase 1 dashboard restoration

Source: `jtunmax/AgriMonitor-Manager`, folder `AgriMonitor-Manager-Clean`.

## Installation

1. Back up the existing `main` branch or create a new branch `feature/dashboard-restoration`.
2. Copy the `AgriMonitor-Manager-Clean/` folder contents into the matching directory of the branch, replacing the same-named files.
3. From `AgriMonitor-Manager-Clean`, run `npm install`, `npm run typecheck`, `npm run build`.
4. Check Vercel project Root Directory is `AgriMonitor-Manager-Clean`.

## Environment variables

- `VITE_DRONE_NDVI_URL` (optional; default: San Lazaro ImageServer)
- `VITE_DRONE_NDVI_ITEM_ID` (optional; if set, takes precedence over URL)
- `VITE_SIMIS_FEATURE_URL` (optional; SIMIS FeatureLayer endpoint)

## Preserved behaviour

- ArcGIS satellite basemap, Sketch polygon drawing, polygon selection and zoom, NDVI imagery, optional SIMIS, existing localStorage field records (`agrimonitor.manager.fields.v1`).
- Data remains browser-local; a second browser will not show the first browser's records.

## Not yet implemented / unverified

- Numerical NDVI values, field raster statistics, crop condition, alerts, survey dates and service-specific legend.
- No database, SIMIS parcel linking, field editing, imagery history or report storage in Phase 1.
- This archive was generated without a dependency installation or a complete build test in the current runtime. Run the commands above before deploying.
