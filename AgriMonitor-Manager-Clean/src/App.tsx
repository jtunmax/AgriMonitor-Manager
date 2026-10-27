import { useEffect, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import ImageryTileLayer from '@arcgis/core/layers/ImageryTileLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Polygon from '@arcgis/core/geometry/Polygon';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import Sketch from '@arcgis/core/widgets/Sketch';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import { FieldRecord, loadFields, saveFields } from './fields';

type Tab = 'Fields' | 'Monitoring' | 'Reports' | 'Alerts' | 'Insights';
type FormData = { name: string; fieldCode: string; simisId: string; farm: string; variety: string; cropStage: string; ratoonNumber: string; cropDate: string; notes: string };
const emptyForm: FormData = { name: '', fieldCode: '', simisId: '', farm: '', variety: '', cropStage: '', ratoonNumber: '', cropDate: '', notes: '' };
const TABS: Tab[] = ['Fields', 'Monitoring', 'Reports', 'Alerts', 'Insights'];
const SIMIS_URL = import.meta.env.VITE_SIMIS_FEATURE_URL?.trim();
const NDVI_ITEM = import.meta.env.VITE_DRONE_NDVI_ITEM_ID?.trim();
const NDVI_URL = import.meta.env.VITE_DRONE_NDVI_URL?.trim() || 'https://tiledimageservices3.arcgis.com/rQqixG0Bhyvco3E7/arcgis/rest/services/AT_San_Lazaro__Green_NDVI_Clip/ImageServer';

function safeArea(field: FieldRecord): string {
  try {
    const polygon = new Polygon(field.geometry);
    const hectares = Math.abs(geometryEngine.geodesicArea(polygon, 'hectares'));
    return Number.isFinite(hectares) && hectares > 0 ? `${hectares.toFixed(2)} ha` : 'Unavailable';
  } catch { return 'Unavailable'; }
}

export default function App() {
  const mapNode = useRef<HTMLDivElement>(null);
  const viewRef = useRef<__esri.MapView>();
  const fieldsLayerRef = useRef<GraphicsLayer>();
  const draftLayerRef = useRef<GraphicsLayer>();
  const ndviLayerRef = useRef<ImageryTileLayer>();
  const simisLayerRef = useRef<FeatureLayer>();
  const [fields, setFields] = useState<FieldRecord[]>(loadFields);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<__esri.Polygon | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [tab, setTab] = useState<Tab>('Fields');
  const [adding, setAdding] = useState(false);
  const [ndviVisible, setNdviVisible] = useState(true);
  const [simisVisible, setSimisVisible] = useState(true);
  const [ndviOpacity, setNdviOpacity] = useState(75);
  const [layersOpen, setLayersOpen] = useState(false);
  const [status, setStatus] = useState('Initializing GIS map…');
  const [ndviStatus, setNdviStatus] = useState('Loading imagery service…');
  const selectedField = fields.find(f => f.id === selected);

  useEffect(() => {
    if (!mapNode.current) return;
    const registered = new GraphicsLayer({ title: 'Registered fields' });
    const draft = new GraphicsLayer({ title: 'Boundary drawing' });
    fieldsLayerRef.current = registered;
    draftLayerRef.current = draft;
    const map = new Map({ basemap: 'satellite', layers: [registered, draft] });
    if (SIMIS_URL) {
      const simis = new FeatureLayer({ url: SIMIS_URL, title: 'SIMIS field boundaries', opacity: .65, outFields: ['*'] });
      simisLayerRef.current = simis;
      map.add(simis, 0);
      simis.load().catch(() => setStatus('SIMIS layer could not load. Verify its URL and sharing permissions.'));
    }
    const imagery = NDVI_ITEM
      ? new ImageryTileLayer({ portalItem: { id: NDVI_ITEM }, title: 'San Lazaro drone NDVI', opacity: .75 })
      : new ImageryTileLayer({ url: NDVI_URL, title: 'San Lazaro drone NDVI', opacity: .75 });
    ndviLayerRef.current = imagery;
    map.add(imagery, 0);
    imagery.load().then(() => setNdviStatus('Imagery service available; numerical NDVI values not verified.'))
      .catch(() => { setNdviStatus('Imagery unavailable'); setStatus('NDVI imagery failed to load. Check the ArcGIS service and access permissions.'); });
    const view = new MapView({ container: mapNode.current, map, center: [-88.66, 18.03], zoom: 13, ui: { components: ['zoom', 'attribution'] } });
    viewRef.current = view;
    const sketch = new Sketch({ view, layer: draft, creationMode: 'single', availableCreateTools: ['polygon'], visibleElements: { selectionTools: { 'lasso-selection': false, 'rectangle-selection': false } } });
    view.ui.add(sketch, 'top-right');
    const createHandle = sketch.on('create', e => {
      if (e.state === 'complete' && e.graphic.geometry?.type === 'polygon') {
        setPending((e.graphic.geometry as __esri.Polygon).clone());
        setAdding(true);
        setTab('Fields');
        setStatus('Boundary complete. Enter field details and save.');
      }
    });
    const clickHandle = view.on('click', async e => {
      const hit = await view.hitTest(e);
      const match = hit.results.find(r => r.type === 'graphic' && r.graphic.layer === registered);
      if (match?.type === 'graphic' && typeof match.graphic.attributes?.id === 'string') {
        setSelected(match.graphic.attributes.id);
        setAdding(false);
        setTab('Fields');
      }
    });
    view.when(() => setStatus('Map ready. Use the polygon tool to register a field.')).catch(() => setStatus('Map could not initialize.'));
    return () => { createHandle.remove(); clickHandle.remove(); sketch.destroy(); view.destroy(); viewRef.current = undefined; };
  }, []);

  useEffect(() => {
    const layer = fieldsLayerRef.current;
    if (!layer) return;
    layer.removeAll();
    fields.forEach(field => {
      try {
        layer.add(new Graphic({
          geometry: new Polygon(field.geometry),
          attributes: { id: field.id, name: field.name },
          symbol: new SimpleFillSymbol({
            color: [20, 110, 66, .16],
            outline: { color: field.id === selected ? [255, 201, 55, 1] : [71, 220, 134, 1], width: field.id === selected ? 3 : 2 }
          })
        }));
      } catch { /* A corrupt older geometry cannot block the map. */ }
    });
    try { saveFields(fields); } catch { setStatus('Unable to save fields in browser storage.'); }
  }, [fields, selected]);
  useEffect(() => { if (ndviLayerRef.current) ndviLayerRef.current.visible = ndviVisible; }, [ndviVisible]);
  useEffect(() => { if (ndviLayerRef.current) ndviLayerRef.current.opacity = ndviOpacity / 100; }, [ndviOpacity]);
  useEffect(() => { if (simisLayerRef.current) simisLayerRef.current.visible = simisVisible; }, [simisVisible]);

  const updateForm = (key: keyof FormData, value: string) => setForm(old => ({ ...old, [key]: value }));
  function register() {
    if (!pending || !form.name.trim()) { setStatus('A drawn boundary and a field name are required.'); return; }
    const id = crypto.randomUUID();
    const record: FieldRecord = {
      id, name: form.name.trim(), fieldCode: form.fieldCode.trim() || undefined,
      simisId: form.simisId.trim() || undefined, farm: form.farm.trim() || undefined,
      variety: form.variety.trim() || undefined, cropStage: form.cropStage || undefined,
      ratoonNumber: form.ratoonNumber === '' ? undefined : Number(form.ratoonNumber),
      cropDate: form.cropDate || undefined, notes: form.notes.trim() || undefined,
      source: 'drawn', geometry: pending.toJSON() as __esri.PolygonProperties, createdAt: new Date().toISOString()
    };
    setFields(current => [...current, record]);
    setSelected(id); setPending(null); setForm(emptyForm); setAdding(false);
    draftLayerRef.current?.removeAll();
    setStatus('Field registered in this browser only. Data is not shared across devices.');
  }
  function zoomTo(field: FieldRecord) {
    setSelected(field.id); setAdding(false);
    const g = fieldsLayerRef.current?.graphics.find(g => g.attributes?.id === field.id);
    const extent = g?.geometry?.extent;
    if (extent) void viewRef.current?.goTo(extent.expand(1.5));
  }
  function zoomToImagery() {
    const extent = ndviLayerRef.current?.fullExtent;
    if (extent) void viewRef.current?.goTo(extent.expand(1.2));
    else setStatus('Imagery extent is not currently available.');
  }
  const missing = (title: string, description: string) => <div className="empty-state"><div className="empty-icon">◇</div><h3>{title}</h3><p>{description}</p></div>;

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand"><div className="brand-mark">A<span>✳</span></div><div><strong>AgriMonitor</strong><small>Agricultural Monitoring &amp; Early Warning System</small></div></div>
      <div className="header-right"><span className="region">BELIZE · MANAGEMENT CONSOLE</span><span className="local-badge">LOCAL PROTOTYPE</span></div>
    </header>
    <div className="workspace">
      <main className="map-area">
        <div ref={mapNode} className="map-canvas" aria-label="Interactive ArcGIS field map" />
        <div className="map-top"><div className="map-title"><strong>Field Explorer</strong><small>Northern Belize · Satellite basemap</small></div><button className="map-action" onClick={() => setLayersOpen(v => !v)}>▧ Layers</button></div>
        {layersOpen && <div className="layers-popover"><h3>Map layers</h3><label className="toggle"><input type="checkbox" checked={ndviVisible} onChange={e => setNdviVisible(e.target.checked)} /> Drone NDVI imagery</label><label className="range-label">Imagery opacity <b>{ndviOpacity}%</b><input type="range" min="0" max="100" value={ndviOpacity} onChange={e => setNdviOpacity(Number(e.target.value))}/></label><button className="text-button" onClick={zoomToImagery}>Zoom to imagery coverage</button><label className="toggle"><input type="checkbox" checked={simisVisible} onChange={e => setSimisVisible(e.target.checked)} disabled={!SIMIS_URL}/> SIMIS boundaries</label><small>{SIMIS_URL ? 'SIMIS URL configured' : 'SIMIS service URL not configured'}</small><div className="legend"><b>NDVI imagery</b><span>Colours use the published ArcGIS renderer; numerical values and legend thresholds have not been verified.</span></div></div>}
        <div className="map-footer"><span className="status-dot" />{status}</div>
      </main>
      <aside className="manager-panel">
        <div className="panel-heading"><div><p className="eyebrow">AGRICULTURAL OPERATIONS</p><h1>Management Dashboard</h1></div><span className="panel-icon">▦</span></div>
        <nav className="tabs" aria-label="Management sections">{TABS.map(t => <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => { setTab(t); setAdding(false); }}>{t}</button>)}</nav>
        <div className="panel-content">
        {tab === 'Fields' && <>
          <div className="section-row"><div><h2>Field Registry</h2><p className="subtle">Manage sugarcane field boundaries and details</p></div><button className="primary compact" onClick={() => { setAdding(true); setSelected(null); }}>+ Add Field</button></div>
          <div className="stat-grid"><div className="stat-card"><span>Registered Fields</span><b>{fields.length}</b><small>Browser-local records</small></div><div className="stat-card"><span>With Boundaries</span><b>{fields.filter(f => !!f.geometry?.rings).length}</b><small>Mapped polygons</small></div></div>
          {adding ? <div className="entry-card"><div className="section-row"><h3>Register New Field</h3><button className="text-button" onClick={() => setAdding(false)}>Cancel</button></div><p className="subtle">Draw a polygon using the map tool, then add known details. Only name and boundary are required.</p>
            <label>Field name *<input value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g. San Lazaro Block A"/></label>
            <div className="form-grid"><label>Field identifier<input value={form.fieldCode} onChange={e => updateForm('fieldCode', e.target.value)} placeholder="Optional"/></label><label>SIMIS reference<input value={form.simisId} onChange={e => updateForm('simisId', e.target.value)} placeholder="Optional"/></label></div>
            <label>Farm / association<input value={form.farm} onChange={e => updateForm('farm', e.target.value)} placeholder="Optional"/></label>
            <div className="form-grid"><label>Cane variety<input value={form.variety} onChange={e => updateForm('variety', e.target.value)} placeholder="Unknown"/></label><label>Crop status<select value={form.cropStage} onChange={e => updateForm('cropStage', e.target.value)}><option value="">Not recorded</option><option value="plant-cane">Plant cane</option><option value="ratoon">Ratoon</option></select></label></div>
            <div className="form-grid"><label>Ratoon number<input type="number" min="0" step="1" value={form.ratoonNumber} onChange={e => updateForm('ratoonNumber', e.target.value)} placeholder="Optional"/></label><label>Planting / last harvest<input type="date" value={form.cropDate} onChange={e => updateForm('cropDate', e.target.value)}/></label></div>
            <label>Notes<textarea rows={2} value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Optional observations"/></label>
            <div className={pending ? 'boundary-state ready' : 'boundary-state'}>{pending ? '✓ Boundary drawn — ready to register' : 'Boundary required — use the polygon drawing tool on the map'}</div>
            <button className="primary full" disabled={!pending || !form.name.trim()} onClick={register}>Save Field</button>
          </div> : selectedField ? <div className="entry-card"><div className="section-row"><h3>{selectedField.name}</h3><button className="text-button" onClick={() => setSelected(null)}>Back</button></div><p className="subtle">Registered field · {selectedField.source === 'drawn' ? 'Drawn boundary' : 'SIMIS reference'}</p><div className="details-grid"><span>Area</span><b>{safeArea(selectedField)}</b><span>Field ID</span><b>{selectedField.fieldCode || 'Not recorded'}</b><span>SIMIS reference</span><b>{selectedField.simisId || 'Not linked'}</b><span>Farm / association</span><b>{selectedField.farm || 'Not recorded'}</b><span>Variety</span><b>{selectedField.variety || 'Not recorded'}</b><span>Crop status</span><b>{selectedField.cropStage || 'Not recorded'}</b><span>Ratoon number</span><b>{selectedField.ratoonNumber ?? 'Not recorded'}</b><span>Crop-cycle date</span><b>{selectedField.cropDate || 'Not recorded'}</b></div>{selectedField.notes && <p className="field-notes">{selectedField.notes}</p>}<button className="secondary full" onClick={() => zoomTo(selectedField)}>Zoom to field</button><div className="evidence"><b>Monitoring evidence</b><span>No field-level observations have been verified or linked to this boundary.</span></div></div> : null}
          <div className="section-row list-head"><h3>Registered Fields</h3><span className="count">{fields.length}</span></div>
          {fields.length ? <div className="field-list">{fields.map(f => <button key={f.id} className={f.id === selected ? 'field-row selected' : 'field-row'} onClick={() => zoomTo(f)}><span className="field-marker">▱</span><span className="field-copy"><b>{f.name}</b><small>{f.variety || 'Variety not recorded'} · {safeArea(f)}</small></span><span>›</span></button>)}</div> : missing('No fields registered', 'Draw a field boundary on the map and register your first sugarcane field.')}
        </>}
        {tab === 'Monitoring' && <><h2>Field Monitoring</h2><p className="subtle">Published imagery is available as a map layer. Field-level calculations require verified raster values and survey metadata.</p><div className="info-card"><b>San Lazaro · Drone NDVI</b><p>{ndviStatus}</p><label className="toggle"><input type="checkbox" checked={ndviVisible} onChange={e => setNdviVisible(e.target.checked)}/> Show imagery on map</label><button className="secondary full" onClick={zoomToImagery}>Zoom to imagery coverage</button></div>{missing('No validated time series', 'Historical drone and satellite observations have not been imported. No vegetation condition is inferred.')}</>}
        {tab === 'Reports' && <><h2>Inspection &amp; Reports</h2>{missing('No inspection reports yet', 'The field inspection workflow and report database have not been connected. No sample reports are displayed.')}</>}
        {tab === 'Alerts' && <><h2>Early Warnings</h2>{missing('Alerts not evaluated', 'Alert rules require verified measurements and historical context. No conclusion can yet be made about field conditions.')}</>}
        {tab === 'Insights' && <><h2>Management Insights</h2><div className="info-card"><b>Data availability</b><div className="details-grid"><span>Registered boundaries</span><b>{fields.length} local</b><span>Drone imagery service</span><b>{ndviStatus.startsWith('Imagery service') ? 'Connected' : 'Unverified'}</b><span>SIMIS</span><b>{SIMIS_URL ? 'Configured' : 'Not configured'}</b><span>Satellite observations</span><b>Not integrated</b><span>Soil sensors</span><b>Not connected</b><span>Inspections</span><b>No records</b></div></div>{missing('No analytical conclusions', 'Field trends, health categories and recommendations will appear only after evidence is processed and validated.')}</>}
        </div>
        <footer className="panel-footer">AgriMonitor · Management application <span>PHASE 1</span></footer>
      </aside>
    </div>
  </div>;
}
