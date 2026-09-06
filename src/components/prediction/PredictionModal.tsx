import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Info,
  Lightbulb,
  Loader2,
  TrendingUp,
  X,
} from 'lucide-react'
import { fetchMetrics, fetchPredict, fetchDataRange, type PredictApiResult } from '@/api/predict'
import { PredictionChart } from '@/components/charts/AnalysisCharts'
import HudPanel from '@/components/ui/HudPanel'
import {
  DATA_DATE_MAX,
  DATA_DATE_MIN,
  normalizeDateRange,
} from '@/data/dataBounds'
import {
  EVENT_FACTORS,
  LINE_SEGMENTS,
  PREDICT_GRANULARITIES,
  PREDICT_METHODS,
  PREDICT_SCOPES,
  STATIONS,
  TIME_SLOTS,
  WEATHER_FACTORS,
} from '@/data/stations'
import {
  ALERTS,
  MODEL_COMPARE,
  genPeakSuggestions,
  genPredictionData,
  getFactorImpact,
} from '@/data/mockData'
import { useAppStore, getStationName } from '@/store/useAppStore'
import type {
  EventFactor,
  MetricItem,
  PredictGranularity,
  PredictMethod,
  PredictScope,
  WeatherFactor,
} from '@/types'

function Trend({ v }: { v: number }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] ${v >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
    >
      {v >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {Math.abs(v)}%
    </span>
  )
}

function KpiStrip({ items }: { items: MetricItem[] }) {
  const colorMap = {
    cyan: 'from-cyan-500/15 to-transparent border-cyan-500/30',
    green: 'from-emerald-500/15 to-transparent border-emerald-500/30',
    orange: 'from-amber-500/15 to-transparent border-amber-500/30',
    red: 'from-red-500/15 to-transparent border-red-500/30',
  }
  const textMap = {
    cyan: 'text-cyan-300',
    green: 'text-emerald-300',
    orange: 'text-amber-300',
    red: 'text-red-300',
  }

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((m) => (
        <div
          key={m.label}
          className={`rounded-sm border bg-gradient-to-br px-3 py-2 ${colorMap[m.color]}`}
        >
          <div className="flex items-start justify-between gap-1">
            <span className="text-[10px] text-slate-500">{m.label}</span>
            {m.trend !== undefined && <Trend v={m.trend} />}
          </div>
          <div className={`mt-1 font-mono text-xl font-bold leading-none ${textMap[m.color]}`}>
            {m.value}
            {m.unit && (
              <span className="ml-1 text-[10px] font-normal text-slate-500">{m.unit}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function InsightCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-sm border border-cyan-500/20 bg-slate-950/45 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-cyan-300/90">
        <Lightbulb size={13} className="text-amber-400" />
        {title}
      </div>
      {children}
    </div>
  )
}

function AlertList() {
  const list = ALERTS.filter((a) => a.level === 'info' || a.level === 'warning').slice(0, 2)
  const icons = { info: Info, warning: AlertTriangle, danger: AlertTriangle }
  const colors = {
    info: 'border-blue-500/25 bg-blue-500/5 text-blue-300',
    warning: 'border-amber-500/25 bg-amber-500/5 text-amber-300',
    danger: 'border-red-500/25 bg-red-500/5 text-red-300',
  }

  return (
    <div className="space-y-2">
      {list.map((a) => {
        const Icon = icons[a.level]
        return (
          <div
            key={a.id}
            className={`flex gap-2 rounded-md border p-2.5 text-xs ${colors[a.level]}`}
          >
            <Icon size={14} className="mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="leading-snug text-slate-300">{a.message}</p>
              <span className="text-[10px] text-slate-500">{a.time}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PredictionModal() {
  const open = useAppStore((s) => s.predictionOpen)
  const closePrediction = useAppStore((s) => s.closePrediction)
  const filter = useAppStore((s) => s.filter)
  const updateFilter = useAppStore((s) => s.updateFilter)
  const selectedId = useAppStore((s) => s.selectedStationId)
  const segmentId = useAppStore((s) => s.sectionSegmentId)
  const setSelectedStation = useAppStore((s) => s.setSelectedStation)
  const setSectionSegment = useAppStore((s) => s.setSectionSegment)
  const predictNonce = useAppStore((s) => s.predictNonce)
  const bumpPredict = useAppStore((s) => s.bumpPredict)
  const showToast = useAppStore((s) => s.showToast)

  const [loading, setLoading] = useState(false)
  const [pred, setPred] = useState<PredictApiResult | null>(null)
  const [fromApi, setFromApi] = useState(false)
  const [modelRows, setModelRows] = useState(MODEL_COMPARE)
  const [dataMin, setDataMin] = useState(DATA_DATE_MIN)
  const [dataMax, setDataMax] = useState(DATA_DATE_MAX)

  const updateTimeRange = (key: 'start' | 'end', value: string) => {
    const next = { ...filter.timeRange, [key]: value }
    if (key === 'start' && next.end < next.start) next.end = next.start
    if (key === 'end' && next.end < next.start) next.start = next.end
    updateFilter({ timeRange: next })
  }

  const updateDateRange = (key: 'start' | 'end', value: string) => {
    const next = normalizeDateRange({ ...filter.dateRange, [key]: value })
    updateFilter({ dateRange: next })
  }

  const methodLabel =
    PREDICT_METHODS.find((m) => m.value === filter.predictMethod)?.label ?? filter.predictMethod
  const scopeLabel =
    PREDICT_SCOPES.find((s) => s.value === filter.predictScope)?.label ?? filter.predictScope
  const grainLabel =
    PREDICT_GRANULARITIES.find((g) => g.value === filter.predictGranularity)?.label ?? '日'
  const weatherLabel = WEATHER_FACTORS.find((w) => w.value === filter.weatherFactor)?.label ?? ''
  const eventLabel = EVENT_FACTORS.find((e) => e.value === filter.eventFactor)?.label ?? ''
  const impact = getFactorImpact(filter.weatherFactor, filter.eventFactor)
  const impactPct = Math.round(impact.total * 100)

  const grainHint =
    filter.predictGranularity === 'hour'
      ? `按 ${filter.dateRange.end} 当日 ${filter.timeRange.start}–${filter.timeRange.end} 小时序列`
      : filter.predictGranularity === 'week'
        ? `按周汇总 ${filter.dateRange.start} ~ ${filter.dateRange.end}`
        : filter.predictGranularity === 'month'
          ? `按月汇总 ${filter.dateRange.start} ~ ${filter.dateRange.end}`
          : `按日 ${filter.dateRange.start} ~ ${filter.dateRange.end}`

  const forecastKpiLabel =
    filter.predictGranularity === 'hour'
      ? '末时预测'
      : filter.predictGranularity === 'week'
        ? '末周预测'
        : filter.predictGranularity === 'month'
          ? '末月预测'
          : '末日预测'

  const mockPred = useMemo(
    () => genPredictionData(filter, { stationId: selectedId, segmentId }),
    [filter, selectedId, segmentId],
  )

  const runPredict = useCallback(() => {
    bumpPredict()
  }, [bumpPredict])

  useEffect(() => {
    if (!open) return
    setPred(null)
    setFromApi(false)
  }, [open, filter, selectedId, segmentId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const { filter: f, selectedStationId, sectionSegmentId } = useAppStore.getState()
    ;(async () => {
      try {
        const data = await fetchPredict({
          filter: f,
          stationId: selectedStationId,
          segmentId: sectionSegmentId,
        })
        if (cancelled) return
        setPred(data)
        setFromApi(true)
      } catch (e) {
        if (cancelled) return
        setPred(null)
        setFromApi(false)
        showToast(
          e instanceof Error ? `预测服务: ${e.message}（已用本地演示）` : '预测服务不可用',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, predictNonce, showToast])

  useEffect(() => {
    if (!open) return
    fetchDataRange()
      .then((range) => {
        if (range.min) setDataMin(range.min)
        if (range.max) setDataMax(range.max)
        const { filter: f, updateFilter: setFilter } = useAppStore.getState()
        const next = normalizeDateRange(f.dateRange)
        if (range.max && (f.dateRange.end > range.max || f.dateRange.end < (range.min ?? DATA_DATE_MIN))) {
          setFilter({ dateRange: { start: range.max, end: range.max } })
        } else if (next.start !== f.dateRange.start || next.end !== f.dateRange.end) {
          setFilter({ dateRange: next })
        }
      })
      .catch(() => undefined)
  }, [open])

  useEffect(() => {
    if (!open) return
    fetchMetrics()
      .then((res) => {
        const byMethod = new Map<string, number>()
        for (const m of res.models || []) {
          if (m.scope === 'line' && typeof m.mape === 'number') {
            byMethod.set(m.method, m.mape)
          }
        }
        if (byMethod.size === 0) return
        setModelRows(
          MODEL_COMPARE.map((row) => {
            const mape = byMethod.get(row.method) ?? row.mape
            return { ...row, mape, score: Math.round((100 - mape) * 10) / 10 }
          }),
        )
      })
      .catch(() => undefined)
  }, [open, predictNonce])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePrediction()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closePrediction])

  const view = pred ?? mockPred
  const peakPack = useMemo(() => genPeakSuggestions(filter), [filter])
  const useWan =
    filter.predictScope === 'line' &&
    filter.predictGranularity !== 'hour' &&
    view.tomorrow >= 10000
  const tomorrowLabel = useWan
    ? (view.tomorrow / 10000).toFixed(1)
    : view.tomorrow.toLocaleString()
  const tomorrowUnit = useWan ? '万' : '人次'

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#020814]/65 backdrop-blur-sm"
        aria-label="关闭预测"
        onClick={closePrediction}
      />

      <div className="relative flex h-[min(920px,92vh)] w-full max-w-[1280px] flex-col overflow-hidden rounded-lg border border-cyan-500/30 bg-[#061428]/92 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-md">
        {/* 顶栏 */}
        <header className="flex flex-shrink-0 items-center justify-between border-b border-cyan-500/20 bg-[#041220]/60 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-cyan-500/35 bg-cyan-500/10 text-cyan-300">
              <TrendingUp size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-wide text-white">客流预测</h2>
              <p className="text-[10px] tracking-widest text-cyan-400/55">
                PASSENGER FLOW FORECAST · {scopeLabel} · {grainLabel} · {methodLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <span className="flex items-center gap-1.5 text-xs text-cyan-400">
                <Loader2 size={14} className="animate-spin" />
                计算中…
              </span>
            )}
            {fromApi && !loading && (
              <span className="rounded-sm border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                真实预测 · 历史数据训练
              </span>
            )}
            {!fromApi && !loading && (
              <span className="rounded-sm border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                演示数据
              </span>
            )}
            <button
              type="button"
              className="rounded-sm border border-slate-600/50 bg-slate-900/60 p-1.5 text-slate-400 transition hover:border-cyan-500/40 hover:text-cyan-200"
              onClick={closePrediction}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* 左侧：参数 */}
          <aside className="w-[260px] flex-shrink-0 overflow-y-auto border-r border-cyan-500/15 bg-[#041220]/50 p-4 scrollbar-thin">
            <div className="space-y-3">
              <div>
                <label className="field-label">预测粒度</label>
                <div className="flex flex-wrap gap-1">
                  {PREDICT_GRANULARITIES.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      className={`chip-btn flex-1 min-w-[48px] ${filter.predictGranularity === g.value ? 'active' : ''}`}
                      onClick={() =>
                        updateFilter({ predictGranularity: g.value as PredictGranularity })
                      }
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label">
                  {filter.predictGranularity === 'hour' ? '预测日期' : '预测区间'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {filter.predictGranularity !== 'hour' && (
                    <input
                      type="date"
                      className="input-field !py-1.5 !text-xs [color-scheme:dark]"
                      value={filter.dateRange.start}
                      min={dataMin}
                      max={dataMax}
                      onChange={(e) => updateDateRange('start', e.target.value)}
                    />
                  )}
                  <input
                    type="date"
                    className={`input-field !py-1.5 !text-xs [color-scheme:dark] ${filter.predictGranularity === 'hour' ? 'col-span-2' : ''}`}
                    value={filter.dateRange.end}
                    min={
                      filter.predictGranularity === 'hour'
                        ? dataMin
                        : filter.dateRange.start < dataMin
                          ? dataMin
                          : filter.dateRange.start
                    }
                    max={dataMax}
                    onChange={(e) => {
                      if (filter.predictGranularity === 'hour') {
                        updateFilter({
                          dateRange: normalizeDateRange({
                            start: e.target.value,
                            end: e.target.value,
                          }),
                        })
                      } else {
                        updateDateRange('end', e.target.value)
                      }
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                  数据 {dataMin} ~ {dataMax}
                  <br />
                  {grainHint}
                </p>
              </div>

              {filter.predictGranularity === 'hour' && (
                <div>
                  <label className="field-label">小时时段</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      className="input-field !py-1.5 !text-xs"
                      value={filter.timeRange.start}
                      onChange={(e) => updateTimeRange('start', e.target.value)}
                    >
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input-field !py-1.5 !text-xs"
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
              )}

              <div>
                <label className="field-label">预测范围</label>
                <div className="flex flex-wrap gap-1">
                  {PREDICT_SCOPES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className={`chip-btn flex-1 min-w-[70px] ${filter.predictScope === s.value ? 'active' : ''}`}
                      onClick={() => updateFilter({ predictScope: s.value as PredictScope })}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label">预测方法</label>
                <select
                  className="input-field !py-1.5 !text-xs"
                  value={filter.predictMethod}
                  onChange={(e) =>
                    updateFilter({ predictMethod: e.target.value as PredictMethod })
                  }
                >
                  {PREDICT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">天气因子</label>
                <select
                  className="input-field !py-1.5 !text-xs"
                  value={filter.weatherFactor}
                  onChange={(e) =>
                    updateFilter({ weatherFactor: e.target.value as WeatherFactor })
                  }
                >
                  {WEATHER_FACTORS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label">特殊事件</label>
                <select
                  className="input-field !py-1.5 !text-xs"
                  value={filter.eventFactor}
                  onChange={(e) =>
                    updateFilter({ eventFactor: e.target.value as EventFactor })
                  }
                >
                  {EVENT_FACTORS.map((ev) => (
                    <option key={ev.value} value={ev.value}>
                      {ev.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  className="accent-cyan-400"
                  checked={filter.enableCorrection}
                  onChange={(e) => updateFilter({ enableCorrection: e.target.checked })}
                />
                启用实时动态校正
              </label>

              {filter.predictScope === 'station' && (
                <div>
                  <label className="field-label">预测站点</label>
                  <div className="max-h-36 overflow-y-auto rounded-sm border border-cyan-500/15 bg-slate-950/50 p-1 scrollbar-thin">
                    {STATIONS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`block w-full rounded-sm px-2 py-1.5 text-left text-xs transition ${
                          selectedId === s.id
                            ? 'bg-cyan-500/15 text-cyan-200'
                            : 'text-slate-400 hover:bg-slate-900/70'
                        }`}
                        onClick={() => setSelectedStation(s.id)}
                      >
                        {s.order}. {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filter.predictScope === 'section' && (
                <div>
                  <label className="field-label">断面线段</label>
                  <div className="max-h-36 overflow-y-auto rounded-sm border border-cyan-500/15 bg-slate-950/50 p-1 scrollbar-thin">
                    {LINE_SEGMENTS.map((seg) => (
                      <button
                        key={seg.id}
                        type="button"
                        className={`block w-full truncate rounded-sm px-2 py-1.5 text-left text-xs transition ${
                          segmentId === seg.id
                            ? 'bg-cyan-500/15 text-cyan-200'
                            : 'text-slate-400 hover:bg-slate-900/70'
                        }`}
                        onClick={() => setSectionSegment(seg.id)}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" className="btn-primary w-full !py-2 !text-sm" onClick={runPredict}>
                开始预测
              </button>
            </div>
          </aside>

          {/* 中间：图表与 KPI */}
          <main className="min-w-0 flex-1 overflow-y-auto bg-[#041220]/35 p-4 scrollbar-thin">
            <div className="space-y-4">
              <KpiStrip
                items={[
                  {
                    label: forecastKpiLabel,
                    value: tomorrowLabel,
                    unit: tomorrowUnit,
                    trend: 2.8 + impactPct / 10,
                    color: 'cyan',
                  },
                  {
                    label: '预测精度',
                    value: (100 - view.mape).toFixed(1),
                    unit: '%',
                    trend: 0.4,
                    color: 'green',
                  },
                  {
                    label: '置信区间',
                    value: `±${view.mape}`,
                    unit: '%',
                    color: 'orange',
                  },
                  {
                    label: '建议临客',
                    value: peakPack.max.loadRate > 110 ? 2 : 1,
                    unit: '列',
                    color: 'red',
                  },
                ]}
              />

              {filter.enableCorrection && view.deviation > 0 && (
                <div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">
                      实时进站量较预测偏高 {view.deviation}%，已触发动态校正
                    </div>
                    <div className="mt-0.5 text-[10px] text-amber-400/70">
                      {fromApi ? '数据来自预测服务' : '演示数据'}
                    </div>
                  </div>
                </div>
              )}

              <HudPanel
                title={`实际 vs 预测（${grainLabel}）`}
                titleEn="ACTUAL · FORECAST"
                className="p-3"
              >
                <p className="mb-2 text-[10px] text-slate-500">{grainHint}</p>
                <PredictionChart height={280} showCorrection={filter.enableCorrection} data={pred} />
              </HudPanel>

              <InsightCard title="预测结论">
                <ul className="space-y-1.5 text-xs leading-relaxed text-slate-400">
                  <li>
                    · 范围：{scopeLabel}
                    {filter.predictScope === 'station' && selectedId
                      ? ` · ${getStationName(selectedId)}`
                      : ''}
                    {filter.predictScope === 'section' && segmentId
                      ? ` · ${LINE_SEGMENTS.find((s) => s.id === segmentId)?.label ?? segmentId}`
                      : ''}
                  </li>
                  <li>
                    · 粒度：{grainLabel} · {grainHint}
                  </li>
                  <li>· 方法：{methodLabel}</li>
                  <li>
                    · {forecastKpiLabel}约 {tomorrowLabel}
                    {tomorrowUnit}（已含天气/事件修正 {impactPct >= 0 ? '+' : ''}
                    {impactPct}%）
                  </li>
                  <li>
                    · 风险断面：{peakPack.max.from} → {peakPack.max.to}（{peakPack.max.direction}）
                  </li>
                  <li>
                    · 建议增开 {peakPack.max.loadRate > 110 ? 2 : 1} 列临客，并启动站台限流预案
                  </li>
                </ul>
              </InsightCard>
            </div>
          </main>

          {/* 右侧：模型与建议 */}
          <aside className="w-[280px] flex-shrink-0 overflow-y-auto border-l border-cyan-500/15 bg-[#041220]/50 p-4 scrollbar-thin">
            <div className="space-y-3">
              <InsightCard title="模型效果对比">
                <div className="space-y-1">
                  {modelRows.map((m) => (
                    <div
                      key={m.method}
                      className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                        m.method === filter.predictMethod
                          ? 'bg-cyan-500/15 text-cyan-200'
                          : 'text-slate-400'
                      }`}
                    >
                      <span className="w-16 truncate">{m.label}</span>
                      <span className="flex-1 text-slate-500">MAPE {m.mape}%</span>
                      <span className="font-mono text-slate-300">{m.score}</span>
                    </div>
                  ))}
                </div>
              </InsightCard>

              <InsightCard title="天气 / 事件影响">
                <div className="space-y-1 text-xs text-slate-400">
                  <div>
                    天气：{weatherLabel}（{Math.round(impact.weather * 100)}%）
                  </div>
                  <div>
                    事件：{eventLabel}（{Math.round(impact.event * 100)}%）
                  </div>
                  <div className="text-cyan-300">
                    综合修正 {impactPct >= 0 ? '+' : ''}
                    {impactPct}%
                  </div>
                </div>
              </InsightCard>

              <InsightCard title="高峰期运营建议">
                <ul className="space-y-2 text-xs text-slate-400">
                  {peakPack.suggestions.map((s) => (
                    <li key={s.title}>
                      <div className="font-medium text-slate-200">{s.title}</div>
                      <div className="mt-0.5 leading-relaxed">{s.detail}</div>
                      <div className="mt-0.5 text-cyan-400/80">预期：{s.effect}</div>
                    </li>
                  ))}
                </ul>
              </InsightCard>

              <AlertList />
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
