import type { FilterState } from '@/types'

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

export interface PredictApiResult {
  dates: string[]
  actual: number[]
  predicted: number[]
  corrected: number[]
  tomorrow: number
  mape: number
  unit: string
  deviation: number
  scope?: string
  method?: string
}

export interface ModelMetricRow {
  method: string
  scope?: string
  mape?: number
  station_id?: string
  segment_id?: string
}

export async function fetchPredict(params: {
  filter: FilterState
  stationId?: string | null
  segmentId?: string | null
  horizonDays?: number
}): Promise<PredictApiResult> {
  const { filter, stationId, segmentId, horizonDays } = params
  const start = filter.dateRange.start
  const end = filter.dateRange.end || start
  const spanDays = Math.max(
    1,
    Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / (24 * 3600 * 1000),
    ) + 1,
  )
  const body = {
    scope: filter.predictScope,
    method: filter.predictMethod,
    station_id: stationId || null,
    segment_id: segmentId || null,
    horizon_days: horizonDays ?? Math.min(90, Math.max(3, spanDays)),
    as_of: end || null,
    start,
    end,
    granularity: filter.predictGranularity || 'day',
    time_start: filter.timeRange.start,
    time_end: filter.timeRange.end,
    weather_factor: filter.weatherFactor,
    event_factor: filter.eventFactor,
    enable_correction: filter.enableCorrection,
    channel: filter.dataChannel || '',
  }

  const res = await fetch(`${API_BASE}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const err = (await res.json()) as { detail?: string }
      if (err.detail) detail = err.detail
    } catch {
      /* ignore */
    }
    throw new Error(detail || `预测接口错误 ${res.status}`)
  }
  return (await res.json()) as PredictApiResult
}

export async function fetchMetrics(): Promise<{ models: ModelMetricRow[] }> {
  const res = await fetch(`${API_BASE}/api/metrics`)
  if (!res.ok) throw new Error('无法获取模型指标')
  return (await res.json()) as { models: ModelMetricRow[] }
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`)
    return res.ok
  } catch {
    return false
  }
}

export async function fetchDataRange(): Promise<{ min: string | null; max: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/data-range`)
    if (!res.ok) throw new Error('no range')
    return (await res.json()) as { min: string | null; max: string | null }
  } catch {
    return { min: null, max: null }
  }
}

export { API_BASE }
