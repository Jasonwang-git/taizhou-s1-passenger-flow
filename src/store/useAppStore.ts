import { create } from 'zustand'
import type { ViewMode, FilterState, AccRecord, Station } from '@/types'
import { LINE_SEGMENTS, STATIONS } from '@/data/stations'
import { DEFAULT_DATE_RANGE, DEFAULT_TIME_RANGE } from '@/data/dataBounds'
import { fetchAccRecords } from '@/api/accData'
import { parseLineGeoJSON } from '@/utils/geojson'

export type MapBasemap = 'normal' | 'satellite'

interface ToastState {
  id: number
  message: string
}

interface AccDataMeta {
  source?: string[]
  note?: string
  accCount?: number
  internetCount?: number
  loaded: boolean
  loading: boolean
  error?: string
}

interface AppState {
  viewMode: ViewMode
  selectedStationId: string | null
  sectionStationIds: string[]
  sectionSegmentId: string | null
  filter: FilterState
  accData: AccRecord[]
  accDataMeta: AccDataMeta
  loading: boolean
  mapBasemap: MapBasemap
  leftPanelCollapsed: boolean
  rightPanelCollapsed: boolean
  customGeoJSON: GeoJSON.FeatureCollection | null
  mapStations: Station[]
  toast: ToastState | null
  mapLineVisible: boolean
  stationSearch: string
  predictNonce: number
  predictionOpen: boolean

  setViewMode: (mode: ViewMode) => void
  setSelectedStation: (id: string | null) => void
  toggleSectionStation: (id: string) => void
  setSectionSegment: (segmentId: string) => void
  updateFilter: (partial: Partial<FilterState>) => void
  setLoading: (loading: boolean) => void
  setMapBasemap: (basemap: MapBasemap) => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  refreshAccData: () => Promise<void>
  loadAccData: (force?: boolean) => Promise<void>
  importAccRecords: (rows: AccRecord[], replace?: boolean) => void
  importGeoJSON: (geojson: GeoJSON.FeatureCollection) => void
  clearGeoJSON: () => void
  showToast: (message: string) => void
  clearToast: () => void
  setMapLineVisible: (visible: boolean) => void
  setStationSearch: (q: string) => void
  showS1Line: () => void
  hideS1Line: () => void
  bumpPredict: () => void
  openPrediction: () => void
  closePrediction: () => void
}

const defaultSegment = LINE_SEGMENTS[0]

export const useAppStore = create<AppState>((set, get) => ({
  viewMode: 'overview',
  selectedStationId: '1',
  sectionStationIds: [defaultSegment.fromId, defaultSegment.toId],
  sectionSegmentId: defaultSegment.id,
  filter: {
    dateRange: { ...DEFAULT_DATE_RANGE },
    dataChannel: '',
    stationId: '',
    direction: 'down',
    timeRange: { ...DEFAULT_TIME_RANGE },
    predictMethod: 'lstm',
    dayType: 'all',
    predictScope: 'line',
    predictGranularity: 'day',
    weatherFactor: 'none',
    eventFactor: 'none',
    comparePeriod: 'yesterday',
    enableCorrection: true,
  },
  accData: [],
  accDataMeta: { loaded: false, loading: false },
  loading: false,
  mapBasemap: 'normal',
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  customGeoJSON: null,
  mapStations: [],
  toast: null,
  mapLineVisible: true,
  stationSearch: '',
  predictNonce: 0,
  predictionOpen: false,

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
  refreshAccData: async () => {
    await get().loadAccData(true)
  },
  loadAccData: async (force = false) => {
    const { accDataMeta } = get()
    if (accDataMeta.loading) return
    if (accDataMeta.loaded && !force) return
    set({
      accDataMeta: { ...get().accDataMeta, loading: true, error: undefined },
    })
    try {
      const data = await fetchAccRecords(5000)
      set({
        accData: data.records,
        accDataMeta: {
          loaded: true,
          loading: false,
          source: data.source,
          note: data.note,
          accCount: data.accCount,
          internetCount: data.internetCount,
        },
      })
    } catch (e) {
      set({
        accDataMeta: {
          ...get().accDataMeta,
          loading: false,
          loaded: false,
          error: e instanceof Error ? e.message : '加载失败',
        },
      })
      get().showToast(e instanceof Error ? e.message : '真实交易数据加载失败')
    }
  },
  importAccRecords: (rows, replace = true) =>
    set((s) => ({
      accData: replace ? rows : [...rows, ...s.accData],
      accDataMeta: {
        ...s.accDataMeta,
        loaded: true,
        note: replace ? '用户导入 CSV' : s.accDataMeta.note,
      },
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
  bumpPredict: () => set((s) => ({ predictNonce: s.predictNonce + 1 })),
  openPrediction: () => set({ predictionOpen: true }),
  closePrediction: () => set({ predictionOpen: false }),
}))

export function getStationById(id: string) {
  const { mapStations } = useAppStore.getState()
  const list = mapStations.length > 0 ? mapStations : STATIONS
  return list.find((s) => s.id === id)
}

export function getStationName(id: string) {
  return getStationById(id)?.name ?? id
}
