import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Activity,
  AlertTriangle,
  CloudSun,
  LayoutDashboard,
  MapPin,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Route,
  Train,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { LINE_INFO } from '@/data/stations'
import { HEADER_KPIS } from '@/data/mockData'
import { useAppStore } from '@/store/useAppStore'
import { parseLineGeoJSON } from '@/utils/geojson'
import LeftPanel from '@/components/panels/LeftPanel'
import RightPanel from '@/components/panels/RightPanel'
import MetroMap from '@/components/map/MetroMap'
import MapBasemapControls from '@/components/map/MapBasemapControls'
import BootSplash from '@/components/ui/BootSplash'
import PredictionModal from '@/components/prediction/PredictionModal'
import type { ViewMode } from '@/types'

const BOTTOM_TABS: {
  id: string
  label: string
  modes: ViewMode[]
  defaultMode: ViewMode
}[] = [
  { id: 'overview', label: '综合态势', modes: ['overview'], defaultMode: 'overview' },
  {
    id: 'analysis',
    label: '客流分析',
    modes: ['line-flow', 'section-flow', 'station-flow', 'peak-platform', 'imbalance'],
    defaultMode: 'line-flow',
  },
  { id: 'prediction', label: '客流预测', modes: [] as ViewMode[], defaultMode: 'overview' as ViewMode },
  { id: 'data', label: '数据中心', modes: ['acc-data'], defaultMode: 'acc-data' },
]

const KPI_ICONS = [Route, MapPin, Train, AlertTriangle]

export default function DashboardLayout() {
  const leftCollapsed = useAppStore((s) => s.leftPanelCollapsed)
  const rightCollapsed = useAppStore((s) => s.rightPanelCollapsed)
  const viewMode = useAppStore((s) => s.viewMode)
  const predictionOpen = useAppStore((s) => s.predictionOpen)
  const openPrediction = useAppStore((s) => s.openPrediction)
  const closePrediction = useAppStore((s) => s.closePrediction)
  const toggleLeft = useAppStore((s) => s.toggleLeftPanel)
  const toggleRight = useAppStore((s) => s.toggleRightPanel)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const importGeoJSON = useAppStore((s) => s.importGeoJSON)

  const [time, setTime] = useState(new Date())
  const [appReady, setAppReady] = useState(false)
  const handleMapReady = useCallback(() => setAppReady(true), [])

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const activeTab = useMemo(() => {
    if (predictionOpen) return 'prediction'
    return BOTTOM_TABS.find((t) => t.modes.includes(viewMode))?.id ?? 'overview'
  }, [viewMode, predictionOpen])

  const handleImportGeoJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.geojson'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const geojson = JSON.parse(text) as GeoJSON.FeatureCollection
        const parsed = parseLineGeoJSON(geojson)
        if (parsed.linePaths.length === 0 && parsed.stations.length === 0) {
          alert('GeoJSON 中未找到线路（LineString）或站点（Point）')
          return
        }
        importGeoJSON(geojson)
      } catch {
        alert('GeoJSON 文件格式不正确')
      }
    }
    input.click()
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-hud-grid">
      <BootSplash visible={!appReady} />
      <PredictionModal />

      {/* 地图始终挂载以便后台加载；界面与地图就绪后一起淡入 */}
      <div className="absolute inset-0 z-0">
        <MetroMap onReady={handleMapReady} />
        <div className="map-vignette" />
      </div>

      <div
        className={`pointer-events-none relative z-20 flex h-full flex-col transition-opacity duration-500 ${
          appReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* 顶栏：仅标题行，KPI 绝对浮在下方，不占左右栏高度 */}
        <header className="pointer-events-none relative z-30 h-11 flex-shrink-0 px-4 pt-2">
          <div className="pointer-events-auto absolute left-4 top-2 flex flex-col gap-0.5 rounded-sm border border-cyan-500/20 bg-slate-950/45 px-2.5 py-1.5 backdrop-blur-md">
            <div className="font-mono text-[10px] tracking-wide text-slate-300">
              {time.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-cyan-300/85">
              <CloudSun size={11} className="text-cyan-400" />
              晴 26°C
            </div>
          </div>

          <div className="absolute left-1/2 top-1.5 flex -translate-x-1/2 flex-col items-center">
            <div className="hero-title-wrap !px-10">
              <p className="mb-0 text-[8px] tracking-[0.32em] text-cyan-400/55">
                TAIZHOU S1 PASSENGER FLOW PLATFORM
              </p>
              <h1 className="text-[15px] font-bold tracking-[0.22em] text-white drop-shadow-[0_0_14px_rgba(34,211,238,0.4)]">
                台州 S1 线客流预测系统
              </h1>
            </div>
          </div>

          <div className="pointer-events-auto absolute right-4 top-2 flex items-start gap-1.5">
            <button
              className="btn-ghost flex items-center gap-1 !px-2 !py-1 backdrop-blur-md"
              onClick={handleImportGeoJSON}
            >
              <Upload size={12} />
              导入
            </button>
            <button
              className="btn-ghost !px-2 !py-1 backdrop-blur-md"
              title="沉浸模式"
              onClick={() => {
                toggleLeft()
                toggleRight()
              }}
            >
              <Maximize2 size={12} />
            </button>
            <div className="hidden rounded-sm border border-cyan-500/20 bg-slate-950/40 px-2 py-1 text-right text-[9px] text-slate-500 backdrop-blur-md xl:block">
              {LINE_INFO.hours}
            </div>
          </div>

          {/* KPI 浮层：居中，不压缩左右栏 */}
          <div className="pointer-events-auto absolute left-1/2 top-11 z-30 flex -translate-x-1/2 items-center gap-2">
            {HEADER_KPIS.map((k, i) => {
              const Icon = KPI_ICONS[i] ?? Activity
              return (
                <div key={k.label} className="kpi-capsule">
                  <span className="kpi-icon">
                    <Icon size={13} />
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[9px] text-slate-500">{k.label}</span>
                    <span className="font-mono text-[13px] font-semibold text-white">
                      {k.value}
                      <span className="ml-0.5 text-[9px] font-normal text-cyan-400/70">{k.unit}</span>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </header>

        {/* 左右栏：几乎占满剩余高度 */}
        <div className="pointer-events-none relative z-20 min-h-0 flex-1">
          {!leftCollapsed && (
            <div className="float-side float-side-left">
              <LeftPanel />
            </div>
          )}
          {!rightCollapsed && (
            <div className="float-side float-side-right">
              <RightPanel />
            </div>
          )}

          <button
            className="pointer-events-auto absolute top-1 z-[40] rounded-sm border border-cyan-500/35 bg-slate-950/65 p-1 text-slate-400 backdrop-blur-md transition hover:text-cyan-200"
            style={{ left: leftCollapsed ? 8 : 300 }}
            onClick={toggleLeft}
          >
            {leftCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
          <button
            className="pointer-events-auto absolute top-1 z-[40] rounded-sm border border-cyan-500/35 bg-slate-950/65 p-1 text-slate-400 backdrop-blur-md transition hover:text-cyan-200"
            style={{ right: rightCollapsed ? 8 : 342 }}
            onClick={toggleRight}
          >
            {rightCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
          </button>
        </div>

        {appReady && <MapBasemapControls />}

        <div className="relative z-30 flex h-10 flex-shrink-0 items-end justify-center pb-0.5">
          <div className="bottom-nav">
            {BOTTOM_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  if (tab.id === 'prediction') {
                    openPrediction()
                  } else {
                    closePrediction()
                    setViewMode(tab.defaultMode)
                  }
                }}
              >
                {tab.id === 'prediction' && (
                  <TrendingUp size={11} className="mr-1 inline-block opacity-80" />
                )}
                {tab.id === 'overview' && (
                  <LayoutDashboard size={11} className="mr-1 inline-block opacity-80" />
                )}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
