import { create } from 'zustand'
import type { ViewMode, FilterState, AccRecord, Station } from '@/types'
import { LINE_SEGMENTS, STATIONS } from '@/data/stations'
import { genAccData } from '@/data/mockData'
import { parseLineGeoJSON } from '@/utils/geojson'

export type MapBasemap = 'normal' | 'dark' | 'satellite'

interface ToastState {
  id: number
  message: string
}

interface AppState {
  viewMode: ViewMode
  selectedStationId: string | null
  sectionStationIds: string[]
  sectionSegmentId: string | null
  filter: FilterState
  accData: AccRecord[]
  loading: boolean
  mapBasemap: MapBasemap
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
  customGeoJSON: GeoJSON.FeatureCollection | null
  mapStations: Station[]
  toast: ToastState | null
  mapLineVisible: boolean
  stationSearch: string

  setViewMode: (mode: ViewMode) => void
  setSelectedStation: (id: string | null) => void
  toggleSectionStation: (id: string) => void
  setSectionSegment: (segmentId: string) => void
  updateFilter: (partial: Partial<FilterState>) => void
  setLoading: (loading: boolean) => void
  setMapBasemap: (basemap: MapBasemap) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  refreshAccData: () => void
  importAccRecords: (rows: AccRecord[], replace?: boolean) => void
  importGeoJSON: (geojson: GeoJSON.FeatureCollection) => void
  clearGeoJSON: () => void
  showToast: (message: string) => void
  clearToast: () => void
  setMapLineVisible: (visible: boolean) => void
  setStationSearch: (q: string) => void
  showS1Line: () => void
  hideS1Line: () => void
}

const today = new Date().toISOString().slice(0, 10)
const defaultSegment = LINE_SEGMENTS[0]

export const useAppStore = create<AppState>((set, get) => ({
  viewMode: 'overview',
  selectedStationId: '1',
  sectionStationIds: [defaultSegment.fromId, defaultSegment.toId],
  sectionSegmentId: defaultSegment.id,
  filter: {
    dateRange: { start: today, end: today },
    dataChannel: '',
    stationId: '',
    direction: 'down',
    timeRange: { start: '07:00', end: '09:00' },
    predictMethod: 'lstm',
    dayType: 'all',
    predictScope: 'line',
    weatherFactor: 'none',
    eventFactor: 'none',
    comparePeriod: 'yesterday',
    enableCorrection: true,
  },
  accData: genAccData(),
  loading: false,
  mapBasemap: 'dark',
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  customGeoJSON: null,
  mapStations: [],
  toast: null,
  mapLineVisible: true,
  stationSearch: '',

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedStation: (id) => set({ selectedStationId: id }),
  toggleSectionStation: (id) => {
    const current = get().sectionStationIds
    let next: string[]
    if (current.includes(id)) {
      next = current.filter((s) => s !== id)
    } else if (current.length >= 2) {
      next = [id]
    } else {
      next = [...current, id]
    }

    const segment =
      next.length === 2
        ? LINE_SEGMENTS.find(
            (seg) =>
              (seg.fromId === next[0] && seg.toId === next[1]) ||
              (seg.fromId === next[1] && seg.toId === next[0]),
          )
        : undefined

    set({
      sectionStationIds: next,
      sectionSegmentId: segment?.id ?? null,
    })

    if (next.length === 2) {
      const a = getStationName(next[0])
      const b = getStationName(next[1])
      get().showToast(
        segment
          ? `已选择断面线段：${a} → ${b}`
          : `已选择断面站点：${a} → ${b}（非相邻站，请改选线段）`,
      )
    }
  },
  setSectionSegment: (segmentId) => {
    const seg = LINE_SEGMENTS.find((s) => s.id === segmentId)
    if (!seg) return
    set({
      sectionSegmentId: seg.id,
      sectionStationIds: [seg.fromId, seg.toId],
    })
    get().showToast(`已选择断面线段：${seg.label}`)
  },
  updateFilter: (partial) =>
    set((s) => ({ filter: { ...s.filter, ...partial } })),
  setLoading: (loading) => set({ loading }),
  setMapBasemap: (basemap) => set({ mapBasemap: basemap }),
  toggleLeftPanel: () => set((s) => ({ leftPanelCollapsed: !s.leftPanelCollapsed })),
  toggleRightPanel: () => set((s) => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),
  refreshAccData: () => set({ accData: genAccData() }),
  importAccRecords: (rows, replace = true) =>
    set((s) => ({
      accData: replace ? rows : [...rows, ...s.accData],
    })),
  importGeoJSON: (geojson) => {
    const parsed = parseLineGeoJSON(geojson)
    set({
      customGeoJSON: geojson,
      mapStations: parsed.stations,
      selectedStationId: parsed.stations[0]?.id ?? get().selectedStationId,
    })
  },
  clearGeoJSON: () => set({ customGeoJSON: null, mapStations: [] }),
  showToast: (message) => set({ toast: { id: Date.now(), message } }),
  clearToast: () => set({ toast: null }),
  setMapLineVisible: (visible) => set({ mapLineVisible: visible }),
  setStationSearch: (q) => set({ stationSearch: q }),
  showS1Line: () => {
    fetch('/data/s1-line.geojson')
      .then((r) => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        get().importGeoJSON(data)
        set({ mapLineVisible: true })
      })
      .catch(() => undefined)
  },
  hideS1Line: () => {
    get().clearGeoJSON()
    set({ mapLineVisible: false })
  },
}))

export function getStationById(id: string) {
  const { mapStations } = useAppStore.getState()
  const list = mapStations.length > 0 ? mapStations : STATIONS
  return list.find((s) => s.id === id)
}

export function getStationName(id: string) {
  return getStationById(id)?.name ?? id
}
