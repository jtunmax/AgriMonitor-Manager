# AgriVision — Hybrid Management Dashboard 1.2

This package extends the Phase 1.1 hybrid dashboard. The existing ArcGIS MapView, polygon drawing, field-selection, local browser storage (`agrimonitor.manager.fields.v1`), SIMIS configuration and NDVI layer remain in place.

## Additions
- Edit existing field registration details without changing the mapped polygon.
- Field selection and registry context within Monitoring.
- Read public ArcGIS ImageServer metadata when the service URL is configured; show raster band count, pixel type, and service data type if returned.
- Explicitly label survey dates, pixel statistics, and field-level NDVI as unverified.

## Deployment
Unzip and use the `AgriMonitor-Manager-Clean` folder as the Vercel project root, or replace the matching source files on a development branch. Do not overwrite your production deployment without verification.

Run `npm install` and `npm run build`, then test map interactions, existing localStorage fields, edits, layer switches, service metadata and newly drawn fields in a browser.

## Known limits
A live ArcGIS service response could not be verified from this environment. The UI uses browser fetch which may be blocked by service access rules/CORS. Raster values, acquisition dates and survey coverage are not claimed. Dependencies could not be installed in this environment because npm registry DNS failed; TypeScript and production build are therefore **not verified**.

The original GitHub repositories and deployed sites have not been changed.
