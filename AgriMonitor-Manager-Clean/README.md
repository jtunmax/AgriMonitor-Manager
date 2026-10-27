# AgriMonitor — Manager Foundation (standalone Vite project)

This is a **clean, standalone** project; it is **not** the old Tree Tracker repository. Keep this copy separate from the existing CropManager project until it builds and renders successfully.

## Run

```bash
npm install
npm run dev
```

For a production build: `npm run build`.

## What it currently does
- ArcGIS satellite map centered on San Lazaro, Belize.
- Sketch polygon field boundaries and save field names and varieties.
- Store fields in **this browser's localStorage only** (prototype; not shared with other users).
- Display the provided San Lazaro NDVI hosted ImageServer using ArcGIS ImageryTileLayer.
- Toggle the NDVI layer.
- Optionally overlay a SIMIS Feature Layer by setting `VITE_SIMIS_FEATURE_URL` in `.env` (restart dev server).

## Known limitations
- No shared database or access controls; do **not** store personal or sensitive farm records in this prototype.
- Actual imagery availability depends on ArcGIS service sharing settings and client network access.
- This project does not claim to derive numerical NDVI statistics, field health or pest diagnosis.
- New drone surveys must be published and registered separately; history is not implemented yet.

## GitHub / StackBlitz
1. **Create a new empty repository** (recommended) instead of uploading this on top of the mixed tree-tracker files.
2. Extract this ZIP, open `AgriMonitor-Manager-Clean`, and upload **its contents** to the repository root. Verify `src/main.tsx` exists on GitHub.
3. Open StackBlitz's GitHub importer for the **new repository**. Vite should start automatically; if not, run `npm run dev`.
4. Do not connect the new project to your original Lovable repository unless you intentionally choose to migrate.
