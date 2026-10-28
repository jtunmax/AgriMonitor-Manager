export type FieldRecord = {
  id: string;
  name: string;
  fieldCode?: string;
  simisId?: string;
  farm?: string;
  variety?: string;
  cropStage?: string;
  ratoonNumber?: number;
  cropDate?: string;
  notes?: string;
  source: 'drawn' | 'simis';
  geometry: __esri.PolygonProperties;
  createdAt: string;
};

// Retain the original key so existing fields survive this interface upgrade.
const KEY = 'agrimonitor.manager.fields.v1';
export function loadFields(): FieldRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((x): x is FieldRecord => !!x && typeof x.id === 'string' && typeof x.name === 'string' && Array.isArray(x.geometry?.rings))
      : [];
  } catch { return []; }
}
export function saveFields(fields: FieldRecord[]): void {
  localStorage.setItem(KEY, JSON.stringify(fields));
}
