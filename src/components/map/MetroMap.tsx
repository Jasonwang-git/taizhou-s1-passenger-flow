import { useEffect, useMemo, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import { STATIONS } from '@/data/stations'
import { useAppStore } from '@/store/useAppStore'
import { parseLineGeoJSON } from '@/utils/geojson'
import type { MapBasemap } from '@/store/useAppStore'
import type { Station } from '@/types'
import type { AMapMap, AMapMarker, AMapNamespace, AMapPolyline } from '@/types/amap'

const MAP_CENTER: [number, number] = [121.36, 28.48]

const MAP_STYLES: Record<Exclude<MapBasemap, 'satellite'>, string> = {
  normal: 'amap://styles/normal',
}

const BASEMAP_OPTIONS: { key: MapBasemap; label: string }[] = [
  { key: 'normal', label: '标准' },
  { key: 'satellite', label: '卫星' },
]

const COVER_LINE = {
  strokeColor: '#1E90FF',
  strokeWeight: 8,
  outlineColor: '#0B5FFF',
  outlineWeight: 12,
}

function markerHtml(station: Station, selected: boolean, inSection: boolean) {
  const dotClass = [selected ? 'active' : '', inSection ? 'in-section' : '']
    .filter(Boolean)
    .join(' ')
  return `
    <div class="amap-station">
      <div class="station-dot ${dotClass}"></div>
      <span class="station-label ${selected ? 'active' : ''}">${station.name}</span>
    </div>
  `
}

export default function MetroMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<AMapMap | null>(null)
  const AMapRef = useRef<AMapNamespace | null>(null)
  const satelliteRef = useRef<{ setMap: (map: AMapMap | null) => void } | null>(null)
  const roadNetRef = useRef<{ setMap: (map: AMapMap | null) => void } | null>(null)
  const polylinesRef = useRef<AMapPolyline[]>([])
  const markersRef = useRef<AMapMarker[]>([])
  const fitViewKeyRef = useRef('')

  const [status, setStatus] = useState<'loading' | 'ready' | 'nokey' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [loadingOsm, setLoadingOsm] = useState(true)

  const selectedId = useAppStore((s) => s.selectedStationId)
  const sectionIds = useAppStore((s) => s.sectionStationIds)
  const customGeoJSON = useAppStore((s) => s.customGeoJSON)
  const mapBasemap = useAppStore((s) => s.mapBasemap)
  const mapLineVisible = useAppStore((s) => s.mapLineVisible)
  const stationSearch = useAppStore((s) => s.stationSearch)
  const setMapBasemap = useAppStore((s) => s.setMapBasemap)
  const setSelectedStation = useAppStore((s) => s.setSelectedStation)
  const setMapLineVisible = useAppStore((s) => s.setMapLineVisible)
  const importGeoJSON = useAppStore((s) => s.importGeoJSON)
  const viewMode = useAppStore((s) => s.viewMode)

  useEffect(() => {
    let cancelled = false
    setLoadingOsm(true)
    fetch('/data/s1-line.geojson')
      .then((r) => {
        if (!r.ok) throw new Error('未找到线路文件')
        return r.json()
      })
      .then((data: GeoJSON.FeatureCollection) => {
        if (cancelled) return
        importGeoJSON(data)
        setMapLineVisible(true)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingOsm(false)
      })
    return () => {
      cancelled = true
    }
  }, [importGeoJSON, setMapLineVisible])

  const linePaths = useMemo(() => {
    if (!mapLineVisible || !customGeoJSON) return [] as Array<Array<[number, number]>>
    return parseLineGeoJSON(customGeoJSON).linePaths
  }, [mapLineVisible, customGeoJSON])

  const stations = useMemo(() => {
    const q = stationSearch.trim()
    if (!q) return STATIONS
    return STATIONS.filter((s) => s.name.includes(q))
  }, [stationSearch])

  const dataKey = `${mapLineVisible}-${linePaths.length}-${stations.map((s) => s.id).join(',')}`

  useEffect(() => {
    const key = import.meta.env.VITE_AMAP_KEY?.trim()
    if (!key) {
      setStatus('nokey')
      return
    }
    const security = import.meta.env.VITE_AMAP_SECURITY_CODE?.trim()
    if (security) window._AMapSecurityConfig = { securityJsCode: security }

    let cancelled = false
    AMapLoader.load({ key, version: '2.0', plugins: [] })
      .then((AMap) => {
        if (cancelled || !containerRef.current) return
        AMapRef.current = AMap as AMapNamespace
        const map = new (AMap as AMapNamespace).Map(containerRef.current, {
          viewMode: '2D',
          zoom: 11,
          center: MAP_CENTER,
          mapStyle: MAP_STYLES.normal,
          showLabel: true,
          features: ['bg', 'road', 'building'],
          dragEnable: true,
          zoomEnable: true,
          scrollWheel: true,
          doubleClickZoom: true,
          keyboardEnable: true,
          rotateEnable: false,
          pitchEnable: false,
        })
        mapRef.current = map
        requestAnimationFrame(() => map.resize())
        setTimeout(() => map.resize(), 200)
        setStatus('ready')
      })
      .catch((err: Error) => {
        setErrorMsg(err?.message || '高德地图加载失败')
        setStatus('error')
      })

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
      AMapRef.current = null
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const AMap = AMapRef.current
    if (!map || !AMap || status !== 'ready') return
    if (mapBasemap === 'satellite') {
      if (!satelliteRef.current) {
        satelliteRef.current = new AMap.TileLayer.Satellite({ zIndex: 1 })
        roadNetRef.current = new AMap.TileLayer.RoadNet({ zIndex: 2 })
      }
      satelliteRef.current.setMap(map)
      roadNetRef.current?.setMap(map)
    } else {
      satelliteRef.current?.setMap(null)
      roadNetRef.current?.setMap(null)
      map.setMapStyle(MAP_STYLES[mapBasemap])
    }
  }, [mapBasemap, status])

  useEffect(() => {
    const map = mapRef.current
    const AMap = AMapRef.current
    if (!map || !AMap || status !== 'ready') return

    polylinesRef.current.forEach((p) => p.setMap(null))
    markersRef.current.forEach((m) => m.setMap(null))
    polylinesRef.current = []
    markersRef.current = []
    const overlays: unknown[] = []

    if (mapLineVisible) {
      linePaths.forEach((path) => {
        const outline = new AMap.Polyline({
          path,
          strokeColor: COVER_LINE.outlineColor,
          strokeWeight: COVER_LINE.outlineWeight,
          strokeOpacity: 0.35,
          strokeStyle: 'solid',
          lineJoin: 'round',
          lineCap: 'round',
          zIndex: 48,
          bubble: true,
        })
        outline.setMap(map)
        polylinesRef.current.push(outline)
        overlays.push(outline)

        const line = new AMap.Polyline({
          path,
          strokeColor: COVER_LINE.strokeColor,
          strokeWeight: COVER_LINE.strokeWeight,
          strokeOpacity: 0.95,
          strokeStyle: 'solid',
          lineJoin: 'round',
          lineCap: 'round',
          zIndex: 50,
          bubble: true,
        })
        line.setMap(map)
        polylinesRef.current.push(line)
        overlays.push(line)
      })
    }

    stations.forEach((station) => {
      const selected = selectedId === station.id
      const inSection = sectionIds.includes(station.id)
      const marker = new AMap.Marker({
        position: [station.lng, station.lat],
        content: markerHtml(station, selected, inSection),
        anchor: 'bottom-center',
        zIndex: selected ? 120 : 100,
        extData: { id: station.id },
        bubble: true,
      })
      marker.on('click', () => {
        if (useAppStore.getState().viewMode === 'section-flow') {
          useAppStore.getState().toggleSectionStation(station.id)
        } else {
          setSelectedStation(station.id)
        }
      })
      marker.setMap(map)
      markersRef.current.push(marker)
      overlays.push(marker)
    })

    if (overlays.length > 0 && fitViewKeyRef.current !== dataKey) {
      fitViewKeyRef.current = dataKey
      map.setFitView(overlays, false, [60, 60, 60, 60])
    }
  }, [status, dataKey, linePaths, stations, selectedId, sectionIds, setSelectedStation, viewMode, mapLineVisible])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="amap-host h-full w-full" />

      {status === 'nokey' && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 p-6">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-cyan-500/30 bg-slate-900 p-6 text-center shadow-panel">
            <h3 className="text-base font-semibold text-cyan-300">等待配置高德 Key</h3>
          </div>
        </div>
      )}
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/60 text-sm text-cyan-300">
          高德地图加载中…
        </div>
      )}
      {status === 'error' && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 p-6">
          <div className="pointer-events-auto max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 text-center">
            <h3 className="text-base font-semibold text-red-300">地图加载失败</h3>
            <p className="mt-2 text-xs text-slate-400">{errorMsg}</p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="pointer-events-auto absolute bottom-20 left-1/2 flex -translate-x-1/2 gap-1">
            <div className="hud-panel flex gap-1 p-1">
              {BASEMAP_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`chip-btn ${mapBasemap === key ? 'active' : ''}`}
                  onClick={() => setMapBasemap(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="hud-panel px-3 py-1.5 text-[10px] text-slate-400">
              <span className="mr-2 inline-flex items-center gap-1.5">
                <span className="h-1.5 w-6 rounded bg-[#1E90FF] shadow-[0_0_8px_#1E90FF]" /> S1 覆盖线
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                {loadingOsm ? '加载中…' : `${stations.length} 站`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
