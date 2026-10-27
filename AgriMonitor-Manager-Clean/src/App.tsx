import { useEffect, useRef, useState } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import ImageryTileLayer from '@arcgis/core/layers/ImageryTileLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import Sketch from '@arcgis/core/widgets/Sketch';
import { FieldRecord, loadFields, saveFields } from './fields';

const SIMIS_URL = import.meta.env.VITE_SIMIS_FEATURE_URL?.trim();
const NDVI_ITEM = import.meta.env.VITE_DRONE_NDVI_ITEM_ID?.trim();
const NDVI_URL = import.meta.env.VITE_DRONE_NDVI_URL?.trim() || 'https://tiledimageservices3.arcgis.com/rQqixG0Bhyvco3E7/arcgis/rest/services/AT_San_Lazaro__Green_NDVI_Clip/ImageServer';

export default function App() {
  const mapNode = useRef<HTMLDivElement>(null);
  const viewRef = useRef<__esri.MapView>();
  const drawnLayerRef = useRef<GraphicsLayer>();
  const [fields, setFields] = useState<FieldRecord[]>(loadFields);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<__esri.Polygon | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [variety, setVariety] = useState('');
  const [ndviVisible, setNdviVisible] = useState(true);
  const [status, setStatus] = useState('Initializing GIS map…');
  const [drawMode, setDrawMode] = useState(false);
  const ndviLayerRef = useRef<ImageryTileLayer>();
  const draftLayerRef = useRef<GraphicsLayer>();

  useEffect(() => {
    if (!mapNode.current) return;
    const drawn = new GraphicsLayer({ title: 'Registered fields' });
    const draft = new GraphicsLayer({ title: 'Boundary being drawn' });
    drawnLayerRef.current = drawn;
    draftLayerRef.current = draft;
    const map = new Map({ basemap: 'satellite', layers: [drawn, draft] });
    if (SIMIS_URL) {
      map.add(new FeatureLayer({ url: SIMIS_URL, title: 'SIMIS field boundaries', opacity: 0.65, outFields: ['*'] }), 0);
    }
    if (NDVI_ITEM || NDVI_URL) {
      const imagery = NDVI_ITEM
        ? new ImageryTileLayer({ portalItem: { id: NDVI_ITEM }, title: 'San Lazaro drone NDVI', opacity: 0.75 })
        : new ImageryTileLayer({ url: NDVI_URL!, title: 'San Lazaro drone NDVI', opacity: 0.75 });
      ndviLayerRef.current = imagery;
      map.add(imagery, 0);
      imagery.load().catch(() => setStatus('NDVI layer could not load. Check item sharing, service type and ArcGIS access.'));
    }
    const view = new MapView({ container: mapNode.current, map, center: [-88.66, 18.03], zoom: 13, ui: { components: ['zoom', 'attribution'] } });
    viewRef.current = view;
    const sketch = new Sketch({ view, layer: draft, creationMode: 'single', availableCreateTools: ['polygon'], visibleElements: { selectionTools: { 'lasso-selection': false, 'rectangle-selection': false } } });
    view.ui.add(sketch, 'top-right');
    sketch.on('create', (e) => {
      if (e.state === 'complete' && e.graphic.geometry?.type === 'polygon') {
        setPending((e.graphic.geometry as __esri.Polygon).clone());
        setDrawMode(true);
      }
    });
    view.when(() => setStatus('Map ready. Draw a polygon with the tool at the top right, or inspect existing fields.'))
      .catch(() => setStatus('Map initialization failed.'));
    return () => { sketch.destroy(); view.destroy(); viewRef.current = undefined; };
  }, []);

  useEffect(() => {
    const drawn = drawnLayerRef.current;
    if (!drawn) return;
    drawn.removeAll();
    fields.forEach((field) => {
      drawn.add(new Graphic({ geometry: { type: 'polygon', ...field.geometry } as __esri.PolygonProperties,
        attributes: { id: field.id, name: field.name },
        symbol: { type: 'simple-fill', color: [19, 95, 57, 0.12], outline: { color: field.id === selected ? [255, 195, 0, 1] : [17, 103, 65, 1], width: field.id === selected ? 3 : 2 } } as __esri.SimpleFillSymbolProperties }));
    });
    saveFields(fields);
  }, [fields, selected]);

  useEffect(() => { if (ndviLayerRef.current) ndviLayerRef.current.visible = ndviVisible; }, [ndviVisible]);

  function register() {
    if (!pending || !fieldName.trim()) { setStatus('Please draw a polygon and enter a field name.'); return; }
    const id = crypto.randomUUID();
    setFields((f) => [...f, { id, name: fieldName.trim(), variety: variety.trim() || undefined, source: 'drawn', geometry: pending.toJSON() as __esri.PolygonProperties, createdAt: new Date().toISOString() }]);
    setSelected(id);
    setPending(null); setDrawMode(false); setFieldName(''); setVariety('');
    draftLayerRef.current?.removeAll();
    setStatus('Field saved in this browser only. A shared geospatial database is required before operational use.');
  }
  function zoomTo(record: FieldRecord) {
    setSelected(record.id);
    const graphic = drawnLayerRef.current?.graphics.find((g) => g.attributes?.id === record.id);
    if (graphic) viewRef.current?.goTo(graphic.geometry.extent.expand(1.5));
  }
  return <div className="shell">
    <header><div><strong>AgriMonitor</strong><small>Management Console · Belize sugarcane</small></div><span className="prototype">PROTOTYPE · BROWSER-LOCAL FIELDS</span></header>
    <aside>
      <h2>Field Registry</h2><p className="muted">Register field boundaries and connect imagery. Crop monitoring scores are not inferred without data.</p>
      <div className="stat"><strong>{fields.length}</strong><span>Locally registered fields</span></div>
      {fields.length ? <div className="field-list">{fields.map(f => <button key={f.id} className={selected === f.id ? 'active' : ''} onClick={() => zoomTo(f)}><b>{f.name}</b><small>{f.variety || 'Variety not recorded'} · {f.source}</small></button>)}</div> : <p className="muted">No fields registered yet.</p>}
      <h3>New field</h3><p className="muted">Use the polygon drawing tool on the map. Finish the shape to register it.</p>
      <label>Field name<input value={fieldName} onChange={e => setFieldName(e.target.value)} placeholder="e.g. San Lazaro – Block A" /></label>
      <label>Cane variety (optional)<input value={variety} onChange={e => setVariety(e.target.value)} placeholder="Not known" /></label>
      <button className="primary" onClick={register} disabled={!pending || !fieldName.trim()}>Save drawn field</button>
      {drawMode && <p className="muted">Polygon ready for registration.</p>}
      <h3>Layers</h3><label className="check"><input type="checkbox" checked={ndviVisible} onChange={e => setNdviVisible(e.target.checked)} disabled={!NDVI_ITEM && !NDVI_URL}/> San Lazaro drone NDVI</label>
      {!NDVI_ITEM && !NDVI_URL && <p className="muted">Set VITE_DRONE_NDVI_ITEM_ID to load the existing ArcGIS Online imagery tile layer.</p>}
      <p className="muted">SIMIS: {SIMIS_URL ? 'configured' : 'not configured'}</p>
    </aside>
    <main><div ref={mapNode} className="map"/><div className="map-status" role="status">{status}</div></main>
  </div>;
}
