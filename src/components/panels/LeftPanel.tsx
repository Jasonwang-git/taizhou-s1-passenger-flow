import {
  Activity,
  BarChart3,
  Database,
  GitBranch,
  LayoutDashboard,
  MapPin,
  Search,
  TrendingUp,
  Waves,
  X,
} from 'lucide-react'
import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import HudPanel from '@/components/ui/HudPanel'
import {
  COMPARE_PERIODS,
  DATA_CHANNELS,
  DAY_TYPES,
  EVENT_FACTORS,
  LINE_SEGMENTS,
  PREDICT_METHODS,
  PREDICT_SCOPES,
  STATIONS,
  TIME_SLOTS,
  VIEW_MODE_DESC,
  VIEW_MODE_LABELS,
  WEATHER_FACTORS,
} from '@/data/stations'
import type {
  ComparePeriod,
  DataChannel,
  DayType,
  EventFactor,
  PredictMethod,
  PredictScope,
  ViewMode,
  WeatherFactor,
} from '@/types'

const NAV_ITEMS: {
  mode: ViewMode
  icon: typeof Activity
  group: string
}[] = [
  { mode: 'overview', icon: LayoutDashboard, group: '总览' },
  { mode: 'line-flow', icon: Activity, group: '客流分析' },
  { mode: 'section-flow', icon: Waves, group: '客流分析' },
  { mode: 'station-flow', icon: MapPin, group: '客流分析' },
  { mode: 'peak-platform', icon: BarChart3, group: '客流分析' },
  { mode: 'imbalance', icon: GitBranch, group: '客流分析' },
  { mode: 'prediction', icon: TrendingUp, group: '客流预测' },
  { mode: 'acc-data', icon: Database, group: '数据' },
]

export default function LeftPanel() {
  const viewMode = useAppStore((s) => s.viewMode)
  const filter = useAppStore((s) => s.filter)
  const selectedStationId = useAppStore((s) => s.selectedStationId)
  const sectionSegmentId = useAppStore((s) => s.sectionSegmentId)
  const mapLineVisible = useAppStore((s) => s.mapLineVisible)
  const stationSearch = useAppStore((s) => s.stationSearch)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const updateFilter = useAppStore((s) => s.updateFilter)
  const setSelectedStation = useAppStore((s) => s.setSelectedStation)
  const setSectionSegment = useAppStore((s) => s.setSectionSegment)
  const setStationSearch = useAppStore((s) => s.setStationSearch)
  const showS1Line = useAppStore((s) => s.showS1Line)
  const hideS1Line = useAppStore((s) => s.hideS1Line)
  const setLoading = useAppStore((s) => s.setLoading)
  const refreshAccData = useAppStore((s) => s.refreshAccData)

  const handleQuery = () => {
    setLoading(true)
    setTimeout(() => {
      refreshAccData()
      setLoading(false)
    }, 600)
  }

  const suggestions = useMemo(() => {
    const q = stationSearch.trim()
    if (!q) return []
    return STATIONS.filter((s) => s.name.includes(q)).map((s) => s.name).slice(0, 8)
  }, [stationSearch])

  const groups = [...new Set(NAV_ITEMS.map((n) => n.group))]

  const showStationList =
    viewMode !== 'overview' &&
    viewMode !== 'acc-data' &&
    viewMode !== 'line-flow' &&
    viewMode !== 'section-flow' &&
    !(viewMode === 'prediction' && filter.predictScope === 'line')
  const showSegmentList =
    viewMode === 'section-flow' ||
    (viewMode === 'prediction' && filter.predictScope === 'section')
  const showDirection = viewMode === 'section-flow' || viewMode === 'imbalance'
  const showChannel = viewMode === 'acc-data' || viewMode === 'line-flow'
  const showDayType = viewMode === 'overview' || viewMode === 'line-flow' || viewMode === 'station-flow'
  const showCompare = viewMode === 'overview' || viewMode === 'line-flow'
  const showPredictExtras = viewMode === 'prediction'

  const updateTimeRange = (key: 'start' | 'end', value: string) => {
    const next = { ...filter.timeRange, [key]: value }
    if (key === 'start' && next.end < next.start) next.end = next.start
    if (key === 'end' && next.end < next.start) next.start = next.end
    updateFilter({ timeRange: next })
  }

  return (
    <aside className="flex h-full w-full flex-col gap-1.5 overflow-hidden">
      {/* 地图站点搜索 + 线路显隐（移到左侧） */}
      <div className="hud-panel hud-corners flex-shrink-0 p-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-500/70" />
          <input
            className="input-field !py-2 !pl-8 !pr-8 !text-xs"
            placeholder="搜索站点，如：温岭、恩泽"
            value={stationSearch}
            onChange={(e) => setStationSearch(e.target.value)}
          />
          {stationSearch && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              onClick={() => setStationSearch('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {suggestions.length > 0 && (
          <div className="mt-1 max-h-32 overflow-y-auto rounded-sm border border-cyan-500/20 bg-slate-950/90">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                className="block w-full truncate px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-200"
                onClick={() => {
                  setStationSearch(name)
                  const st = STATIONS.find((s) => s.name === name)
                  if (st) setSelectedStation(st.id)
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            className={`chip-btn flex-1 ${mapLineVisible ? 'active' : ''}`}
            onClick={() => showS1Line()}
          >
            显示 S1
          </button>
          <button type="button" className="chip-btn flex-1" onClick={() => hideS1Line()}>
            隐藏线路
          </button>
        </div>
      </div>

      <HudPanel
        className="flex min-h-0 flex-[0.95] flex-col overflow-hidden p-2"
        title="功能导航"
        titleEn="FUNCTION NAV"
        extra={
          <span className="rounded-sm border border-cyan-400/40 bg-cyan-500/15 px-1.5 py-0.5 text-[9px] text-cyan-200">
            {VIEW_MODE_LABELS[viewMode]}
          </span>
        }
      >
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto scrollbar-thin">
          {groups.map((group) => (
            <div key={group}>
              <div className="mb-0.5 px-1 text-[9px] tracking-widest text-slate-500">{group}</div>
              <div className="space-y-0.5">
                {NAV_ITEMS.filter((n) => n.group === group).map(({ mode, icon: Icon }) => {
                  const active = viewMode === mode
                  return (
                    <button
                      key={mode}
                      type="button"
                      className={`group flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition ${
                        active
                          ? 'bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/35'
                          : 'text-slate-400 hover:bg-cyan-500/8 hover:text-slate-200'
                      }`}
                      onClick={() => setViewMode(mode)}
                    >
                      <span
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm ${
                          active
                            ? 'bg-cyan-500/25 text-cyan-300'
                            : 'bg-slate-900/60 text-slate-500 group-hover:text-slate-300'
                        }`}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-medium leading-tight">
                          {VIEW_MODE_LABELS[mode]}
                        </span>
                        <span className="mt-0.5 block truncate text-[9px] text-slate-500">
                          {VIEW_MODE_DESC[mode]}
                        </span>
                      </span>
                      {active && (
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </HudPanel>

      <HudPanel
        className="flex min-h-0 flex-1 flex-col overflow-hidden p-2"
        title="分析条件"
        titleEn="ANALYSIS FILTER"
      >
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-thin">
          <div>
            <label className="field-label !mb-0.5 !text-[10px]">分析日期</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                className="input-field !py-1 !text-[11px]"
                value={filter.dateRange.start}
                onChange={(e) =>
                  updateFilter({ dateRange: { ...filter.dateRange, start: e.target.value } })
                }
              />
              <input
                type="date"
                className="input-field !py-1 !text-[11px]"
                value={filter.dateRange.end}
                min={filter.dateRange.start}
                onChange={(e) =>
                  updateFilter({ dateRange: { ...filter.dateRange, end: e.target.value } })
                }
              />
            </div>
          </div>

          <div>
            <label className="field-label !mb-0.5 !text-[10px]">分析时段</label>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                className="input-field !py-1 !text-[11px]"
                value={filter.timeRange.start}
                onChange={(e) => updateTimeRange('start', e.target.value)}
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                className="input-field !py-1 !text-[11px]"
                value={filter.timeRange.end}
                onChange={(e) => updateTimeRange('end', e.target.value)}
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t} disabled={t < filter.timeRange.start}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showDayType && (
            <div>
              <label className="field-label !mb-0.5 !text-[10px]">日期类型</label>
              <div className="flex flex-wrap gap-1">
                {DAY_TYPES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`chip-btn ${filter.dayType === d.value ? 'active' : ''}`}
                    onClick={() => updateFilter({ dayType: d.value as DayType })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showCompare && (
            <div>
              <label className="field-label !mb-0.5 !text-[10px]">环比对照</label>
              <div className="flex gap-1">
                {COMPARE_PERIODS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`chip-btn flex-1 ${filter.comparePeriod === c.value ? 'active' : ''}`}
                    onClick={() => updateFilter({ comparePeriod: c.value as ComparePeriod })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showChannel && (
            <div>
              <label className="field-label !mb-0.5 !text-[10px]">票种</label>
              <div className="flex gap-1">
                {DATA_CHANNELS.map((c) => (
                  <button
                    key={c.value || 'all'}
                    type="button"
                    className={`chip-btn flex-1 ${filter.dataChannel === c.value ? 'active' : ''}`}
                    onClick={() => updateFilter({ dataChannel: c.value as DataChannel })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDirection && (
            <div>
              <label className="field-label !mb-0.5 !text-[10px]">运行方向</label>
              <div className="flex overflow-hidden rounded-sm border border-cyan-500/25">
                {(['up', 'down'] as const).map((dir) => (
                  <button
                    key={dir}
                    className={`flex-1 py-1.5 text-xs transition ${
                      filter.direction === dir
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : 'text-slate-400 hover:bg-slate-900/60'
                    }`}
                    onClick={() => updateFilter({ direction: dir })}
                  >
                    {dir === 'up' ? '上行' : '下行'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showPredictExtras && (
            <>
              <div>
                <label className="field-label !mb-0.5 !text-[10px]">预测范围</label>
                <div className="flex gap-1">
                  {PREDICT_SCOPES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`chip-btn flex-1 ${filter.predictScope === s.value ? 'active' : ''}`}
                      onClick={() => updateFilter({ predictScope: s.value as PredictScope })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label !mb-0.5 !text-[10px]">预测方法</label>
                <select
                  className="input-field !py-1 !text-[11px]"
                  value={filter.predictMethod}
                  onChange={(e) =>
                    updateFilter({ predictMethod: e.target.value as PredictMethod })
                  }
                >
                  {PREDICT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label !mb-0.5 !text-[10px]">天气因子</label>
                <select
                  className="input-field !py-1 !text-[11px]"
                  value={filter.weatherFactor}
                  onChange={(e) =>
                    updateFilter({ weatherFactor: e.target.value as WeatherFactor })
                  }
                >
                  {WEATHER_FACTORS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label !mb-0.5 !text-[10px]">特殊事件</label>
                <select
                  className="input-field !py-1 !text-[11px]"
                  value={filter.eventFactor}
                  onChange={(e) =>
                    updateFilter({ eventFactor: e.target.value as EventFactor })
                  }
                >
                  {EVENT_FACTORS.map((ev) => (
                    <option key={ev.value} value={ev.value}>{ev.label}</option>
                  ))}
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  className="accent-cyan-400"
                  checked={filter.enableCorrection}
                  onChange={(e) => updateFilter({ enableCorrection: e.target.checked })}
                />
                启用实时动态校正
              </label>
            </>
          )}

          {showSegmentList && (
            <div>
              <label className="field-label !mb-0.5 !text-[10px]">断面线段</label>
              <div className="max-h-40 overflow-y-auto scrollbar-thin rounded-sm border border-cyan-500/15 bg-slate-950/40 p-1">
                {LINE_SEGMENTS.map((seg, idx) => {
                  const active = sectionSegmentId === seg.id
                  return (
                    <button
                      key={seg.id}
                      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition ${
                        active
                          ? 'bg-cyan-500/15 text-cyan-200'
                          : 'text-slate-400 hover:bg-slate-900/70 hover:text-slate-200'
                      }`}
                      onClick={() => setSectionSegment(seg.id)}
                    >
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                          active ? 'bg-cyan-500/30' : 'bg-slate-800'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="min-w-0 truncate">{seg.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {showStationList && (
            <div>
              <label className="field-label !mb-0.5 !text-[10px]">关注站点</label>
              <div className="max-h-40 overflow-y-auto scrollbar-thin rounded-sm border border-cyan-500/15 bg-slate-950/40 p-1">
                {STATIONS.map((s) => {
                  const isActive = selectedStationId === s.id
                  return (
                    <button
                      key={s.id}
                      className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition ${
                        isActive
                          ? 'bg-cyan-500/15 text-cyan-200'
                          : 'text-slate-400 hover:bg-slate-900/70 hover:text-slate-200'
                      }`}
                      onClick={() => setSelectedStation(s.id)}
                    >
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] ${
                          isActive ? 'bg-cyan-500/30' : 'bg-slate-800'
                        }`}
                      >
                        {s.order}
                      </span>
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <button
          className="btn-primary mt-2 flex w-full flex-shrink-0 items-center justify-center gap-2 !py-1.5 !text-xs"
          onClick={handleQuery}
        >
          <Search size={13} />
          查询分析
        </button>
      </HudPanel>
    </aside>
  )
}
