export type FieldRecord = {
  id: string;
  name: string;
  simisId?: string;
  variety?: string;
  cropStage?: string;
  source: 'drawn' | 'simis';
  geometry: __esri.PolygonProperties;
  createdAt: string;
};

const KEY = 'agrimonitor.manager.fields.v1';
export function loadFields(): FieldRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.id === 'string' && x.geometry?.rings) : [];
  } catch { return []; }
}
export function saveFields(fields: FieldRecord[]): void { localStorage.setItem(KEY, JSON.stringify(fields)); }
