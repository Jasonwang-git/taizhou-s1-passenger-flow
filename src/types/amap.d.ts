/** 高德 JS API 运行时类型（按项目用到的子集声明） */
export interface AMapLngLat {
  getLng: () => number
  getLat: () => number
}

export interface AMapMap {
  destroy: () => void
  setFitView: (overlays?: unknown[], immediately?: boolean, avoid?: number[]) => void
  setCenter: (center: [number, number]) => void
  setZoom: (zoom: number) => void
  setMapStyle: (style: string) => void
  resize: () => void
  add: (overlay: unknown) => void
  remove: (overlay: unknown | unknown[]) => void
  clearMap: () => void
  on: (event: string, handler: (...args: unknown[]) => void) => void
  off: (event: string, handler: (...args: unknown[]) => void) => void
}

export interface AMapPolyline {
  setMap: (map: AMapMap | null) => void
  setOptions: (opts: Record<string, unknown>) => void
  setPath: (path: Array<[number, number]>) => void
}

export interface AMapMarker {
  setMap: (map: AMapMap | null) => void
  setPosition: (pos: [number, number]) => void
  on: (event: string, handler: (...args: unknown[]) => void) => void
  getExtData: () => unknown
  setExtData: (data: unknown) => void
  setContent: (html: string) => void
}

export interface AMapNamespace {
  Map: new (container: string | HTMLElement, opts?: Record<string, unknown>) => AMapMap
  Polyline: new (opts?: Record<string, unknown>) => AMapPolyline
  Marker: new (opts?: Record<string, unknown>) => AMapMarker
  TileLayer: {
    Satellite: new (opts?: Record<string, unknown>) => { setMap: (map: AMapMap | null) => void }
    RoadNet: new (opts?: Record<string, unknown>) => { setMap: (map: AMapMap | null) => void }
  }
  Bounds: new (sw: [number, number], ne: [number, number]) => unknown
  LngLat: new (lng: number, lat: number) => AMapLngLat
  plugin: (name: string | string[], cb: () => void) => void
}

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string }
    AMap?: AMapNamespace
  }
}

export {}
