/**
 * 筛选驱动的确定性模拟数据引擎（无后端时演示用）
 * 同一组筛选条件 → 同一结果，便于对比与演示。
 */
import type {
  ComparePeriod,
  DataChannel,
  DayType,
  EventFactor,
  FilterState,
  PredictMethod,
  PredictScope,
  WeatherFactor,
} from '@/types'
import { LINE_SEGMENTS, STATIONS, TIME_SLOTS } from '@/data/stations'

function hashSeed(...parts: Array<string | number | boolean | undefined | null>): number {
  let h = 2166136261
  for (const p of parts) {
    const s = String(p ?? '')
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function dayTypeScale(dayType: DayType): number {
  if (dayType === 'weekend') return 0.82
  if (dayType === 'holiday') return 0.95
  if (dayType === 'workday') return 1.08
  return 1
}

function channelScale(ch: DataChannel): number {
  if (ch === 'acc') return 0.38
  if (ch === 'internet') return 0.62
  return 1
}

function dateSpanDays(filter: FilterState): number {
  const a = new Date(filter.dateRange.start).getTime()
  const b = new Date(filter.dateRange.end).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return 1
  return Math.max(1, Math.round((b - a) / 86400000) + 1)
}

function filterHours(filter: FilterState): string[] {
  return TIME_SLOTS.filter((h) => h >= filter.timeRange.start && h <= filter.timeRange.end)
}

const WEATHER_IMPACT: Record<WeatherFactor, number> = {
  none: 0,
  sunny: 0.02,
  rain: -0.08,
  wind: -0.04,
  hot: -0.05,
  cold: -0.03,
}

const EVENT_IMPACT: Record<EventFactor, number> = {
  none: 0,
  holiday: 0.18,
  concert: 0.25,
  sports: 0.15,
  school: 0.1,
}

export function getFactorImpact(weather: WeatherFactor, event: EventFactor) {
  return {
    weather: WEATHER_IMPACT[weather],
    event: EVENT_IMPACT[event],
    total: WEATHER_IMPACT[weather] + EVENT_IMPACT[event],
  }
}

const BASE_ENTRY = [200, 1800, 8500, 6200, 3800, 3200, 4100, 3500, 4200, 4800, 5500, 9200, 7800, 4600, 3200, 1800, 800]
const BASE_EXIT = [180, 1600, 7200, 5800, 3500, 3000, 4200, 3800, 4000, 4500, 5200, 8800, 8500, 5200, 3400, 2000, 900]

export function genLineFlowData(filter: FilterState, stationId?: string | null) {
  const seed = hashSeed(
    'line',
    filter.dateRange.start,
    filter.dateRange.end,
    filter.dayType,
    filter.dataChannel,
    filter.timeRange.start,
    filter.timeRange.end,
    stationId ?? 'all',
  )
  const rnd = mulberry32(seed)
  const scale =
    dayTypeScale(filter.dayType) *
    (filter.dataChannel ? channelScale(filter.dataChannel) * 1.65 : 1) *
    (stationId ? 0.12 + (Number(stationId) % 7) * 0.02 : 1) *
    Math.sqrt(dateSpanDays(filter))

  const hours = filterHours(filter)
  const idxs = hours.map((h) => TIME_SLOTS.indexOf(h)).filter((i) => i >= 0)
  const entry = idxs.map((i) => Math.round((BASE_ENTRY[i] ?? 1000) * scale * (0.92 + rnd() * 0.16)))
  const exit = idxs.map((i) => Math.round((BASE_EXIT[i] ?? 1000) * scale * (0.92 + rnd() * 0.16)))
  return { hours, entry, exit, totalEntry: entry.reduce((a, b) => a + b, 0), totalExit: exit.reduce((a, b) => a + b, 0) }
}

export function genDayTypeCompareData(filter: FilterState) {
  const seed = hashSeed('daytype', filter.dateRange.start, filter.dataChannel)
  const rnd = mulberry32(seed)
  const hours = TIME_SLOTS
  const ch = filter.dataChannel ? channelScale(filter.dataChannel) * 1.65 : 1
  const workday = BASE_ENTRY.map((v) => Math.round(v * 1.08 * ch * (0.95 + rnd() * 0.1)))
  const weekend = BASE_ENTRY.map((v) => Math.round(v * 0.72 * ch * (0.95 + rnd() * 0.1)))
  const holiday = weekend.map((v) => Math.round(v * 1.18))
  return { hours, workday, weekend, holiday }
}

export function genSectionRates(
  filter: FilterState,
  segmentId?: string | null,
) {
  const seed = hashSeed(
    'section',
    segmentId ?? 'max',
    filter.direction,
    filter.dateRange.start,
    filter.dayType,
    filter.dataChannel,
  )
  const rnd = mulberry32(seed)
  const segIdx = Math.max(0, LINE_SEGMENTS.findIndex((s) => s.id === segmentId))
  const dirBoost = filter.direction === 'down' ? 1.08 : 0.94
  const midBoost = 1 + Math.abs(segIdx - 8) * -0.02 + (segIdx >= 7 && segIdx <= 10 ? 0.18 : 0)

  const slots: string[] = []
  for (let h = 8; h <= 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 18) slots.push(`${String(h).padStart(2, '0')}:30`)
  }

  const peakShape = slots.map((_, i) => {
    const t = i / (slots.length - 1)
    const morning = Math.exp(-Math.pow((t - 0.12) / 0.08, 2))
    const evening = Math.exp(-Math.pow((t - 0.78) / 0.1, 2))
    return 48 + morning * 48 + evening * 72
  })

  return slots.map((time, i) => ({
    time,
    rate: Math.round(clamp(peakShape[i] * dirBoost * midBoost * dayTypeScale(filter.dayType) * (0.94 + rnd() * 0.12), 30, 145)),
    flow: Math.round((peakShape[i] / 100) * 9800 * dirBoost * midBoost * (0.9 + rnd() * 0.2)),
  }))
}

export type MaxSectionResult = {
  segmentId: string
  from: string
  to: string
  direction: '上行' | '下行'
  flow: number
  loadRate: number
  peakTime: string
}

/** 扫描全线断面，自动识别当日最大断面 */
export function identifyMaxSection(filter: FilterState): MaxSectionResult {
  let best: MaxSectionResult | null = null
  for (const seg of LINE_SEGMENTS) {
    for (const dir of ['up', 'down'] as const) {
      const series = genSectionRates({ ...filter, direction: dir }, seg.id)
      const peak = series.reduce((a, b) => (b.flow > a.flow ? b : a), series[0])
      const candidate: MaxSectionResult = {
        segmentId: seg.id,
        from: seg.fromName,
        to: seg.toName,
        direction: dir === 'up' ? '上行' : '下行',
        flow: peak.flow,
        loadRate: peak.rate,
        peakTime: peak.time,
      }
      if (!best || candidate.flow > best.flow) best = candidate
    }
  }
  return best!
}

export function getChannelShare(filter: FilterState) {
  if (filter.dataChannel === 'acc') return [{ name: 'ACC', value: 100 }]
  if (filter.dataChannel === 'internet') return [{ name: '互联网', value: 100 }]
  const seed = hashSeed('share', filter.dateRange.start, filter.dayType)
  const rnd = mulberry32(seed)
  const acc = Math.round(34 + rnd() * 12)
  return [
    { name: 'ACC', value: acc },
    { name: '互联网', value: 100 - acc },
  ]
}

export function getStationRankData(filter: FilterState) {
  const seed = hashSeed('rank', filter.dateRange.start, filter.dayType, filter.dataChannel)
  const rnd = mulberry32(seed)
  const scale = dayTypeScale(filter.dayType) * (filter.dataChannel ? channelScale(filter.dataChannel) * 1.65 : 1)
  return STATIONS.map((s, i) => {
    const hub = i === 0 || i === 8 || i === 14 ? 1.45 : 1
    return {
      name: s.name,
      id: s.id,
      entry: Math.round((9000 + rnd() * 16000) * scale * hub),
      exit: Math.round((8500 + rnd() * 15000) * scale * hub),
    }
  }).sort((a, b) => b.entry - a.entry)
}

export function getHeatmapData(filter: FilterState) {
  const seed = hashSeed('heat', filter.dateRange.start, filter.dayType)
  const rnd = mulberry32(seed)
  const hours = ['06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']
  const stationNames = STATIONS.slice(0, 8).map((s) => s.name.replace('站', ''))
  const data: [number, number, number][] = []
  const scale = dayTypeScale(filter.dayType)
  for (let i = 0; i < stationNames.length; i++) {
    for (let j = 0; j < hours.length; j++) {
      const peak = j === 2 || j === 3 || j === 11 || j === 12 ? 1.8 : 1
      data.push([j, i, Math.round((200 + rnd() * 1800) * scale * peak)])
    }
  }
  return { hours, stationNames, data }
}

/** 早/晚高峰小时对比 */
export function genPeakHourCompare(filter: FilterState) {
  const flow = genLineFlowData({ ...filter, timeRange: { start: '06:00', end: '22:00' } })
  const morningIdx = flow.hours.map((h, i) => ({ h, i, v: flow.entry[i] + flow.exit[i] }))
    .filter((x) => x.h >= '07:00' && x.h <= '09:00')
  const eveningIdx = flow.hours.map((h, i) => ({ h, i, v: flow.entry[i] + flow.exit[i] }))
    .filter((x) => x.h >= '17:00' && x.h <= '19:00')
  const morningPeak = morningIdx.reduce((a, b) => (b.v > a.v ? b : a), morningIdx[0])
  const eveningPeak = eveningIdx.reduce((a, b) => (b.v > a.v ? b : a), eveningIdx[0])
  return {
    labels: ['早高峰峰值', '晚高峰峰值'],
    values: [morningPeak?.v ?? 0, eveningPeak?.v ?? 0],
    morningHour: morningPeak?.h ?? '08:00',
    eveningHour: eveningPeak?.h ?? '17:00',
    hours: flow.hours,
    morningSeries: flow.hours.map((h, i) => (h >= '07:00' && h <= '09:00' ? flow.entry[i] + flow.exit[i] : 0)),
    eveningSeries: flow.hours.map((h, i) => (h >= '17:00' && h <= '19:00' ? flow.entry[i] + flow.exit[i] : 0)),
    allSeries: flow.hours.map((_, i) => flow.entry[i] + flow.exit[i]),
  }
}

/** OD 矩阵（取前 N 站） */
export function genOdMatrix(filter: FilterState, size = 8) {
  const seed = hashSeed('od', filter.dateRange.start, filter.dayType, filter.dataChannel)
  const rnd = mulberry32(seed)
  const stations = STATIONS.slice(0, size)
  const names = stations.map((s) => s.name.replace('站', ''))
  const scale = dayTypeScale(filter.dayType) * (filter.dataChannel ? channelScale(filter.dataChannel) * 1.65 : 1)
  const matrix: number[][] = []
  const pairs: { from: string; to: string; flow: number }[] = []
  for (let i = 0; i < size; i++) {
    const row: number[] = []
    for (let j = 0; j < size; j++) {
      if (i === j) {
        row.push(0)
        continue
      }
      const dist = Math.abs(i - j)
      const v = Math.round((4200 / dist) * scale * (0.6 + rnd() * 0.8) * (i === 0 || j === size - 1 || j === 0 ? 1.35 : 1))
      row.push(v)
      pairs.push({ from: stations[i].name, to: stations[j].name, flow: v })
    }
    matrix.push(row)
  }
  pairs.sort((a, b) => b.flow - a.flow)
  return { names, matrix, top: pairs.slice(0, 5) }
}

export function genCompareTrend(filter: FilterState, period: ComparePeriod) {
  const seed = hashSeed('cmp', period, filter.dateRange.start, filter.dayType)
  const rnd = mulberry32(seed)
  const base = genLineFlowData(filter)
  const total = base.totalEntry + base.totalExit
  const delta = period === 'yesterday' ? 0.03 + rnd() * 0.04 : 0.05 + rnd() * 0.06
  const sign = rnd() > 0.35 ? 1 : -1
  const labels = period === 'yesterday' ? ['昨日', '今日'] : ['上周同期', '本周']
  const prev = Math.round(total / (1 + sign * delta))
  return {
    labels,
    values: [prev, total],
    mom: Math.round(sign * delta * 1000) / 10,
    yoy: Math.round((0.06 + rnd() * 0.04) * 1000) / 10,
    metrics: [
      { label: '总客流', value: total, mom: Math.round(sign * delta * 1000) / 10, yoy: Math.round((0.07 + rnd() * 0.03) * 10) / 10 },
      { label: '进站量', value: base.totalEntry, mom: Math.round((sign * delta - 0.005) * 1000) / 10, yoy: Math.round((0.06 + rnd() * 0.03) * 10) / 10 },
      { label: '出站量', value: base.totalExit, mom: Math.round((sign * delta + 0.004) * 1000) / 10, yoy: Math.round((0.055 + rnd() * 0.03) * 10) / 10 },
    ],
  }
}

const METHOD_NOISE: Record<PredictMethod, number> = {
  lstm: 0.035,
  prophet: 0.048,
  xgboost: 0.042,
  arima: 0.06,
  history: 0.078,
}

const SCOPE_BASE: Record<PredictScope, number> = {
  line: 280000,
  station: 18500,
  section: 9800,
}

export function genPredictionData(
  filter: FilterState,
  opts?: { stationId?: string | null; segmentId?: string | null; days?: number },
) {
  const days = opts?.days ?? 7
  const impact = getFactorImpact(filter.weatherFactor, filter.eventFactor)
  const seed = hashSeed(
    'pred',
    filter.predictMethod,
    filter.predictScope,
    filter.dateRange.start,
    filter.weatherFactor,
    filter.eventFactor,
    opts?.stationId,
    opts?.segmentId,
  )
  const rnd = mulberry32(seed)
  const noise = METHOD_NOISE[filter.predictMethod]
  let base = SCOPE_BASE[filter.predictScope]
  if (filter.predictScope === 'station' && opts?.stationId) {
    base = 12000 + Number(opts.stationId) * 900
  }
  if (filter.predictScope === 'section') {
    const max = identifyMaxSection(filter)
    base = Math.round(max.flow * 18)
  }
  base = Math.round(base * (1 + impact.total) * dayTypeScale(filter.dayType))

  const dates: string[] = []
  const actual: number[] = []
  const predicted: number[] = []
  const corrected: number[] = []
  const start = new Date(filter.dateRange.start)
  if (Number.isNaN(start.getTime())) start.setTime(Date.now())

  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() - (days - 1 - i))
    dates.push(`${d.getMonth() + 1}/${d.getDate()}`)
    const wave = 1 + Math.sin(i / 2) * 0.06
    const truth = Math.round(base * wave * (0.96 + rnd() * 0.08))
    actual.push(i < days - 2 ? truth : 0)
    const err = (rnd() - 0.5) * 2 * noise
    const pred = Math.round(truth * (1 + err))
    predicted.push(pred)
    const corrBias = filter.enableCorrection ? 0.02 + rnd() * 0.04 : 0
    corrected.push(Math.round(pred * (1 + corrBias * (rnd() > 0.4 ? 1 : -0.5))))
  }

  const mape = Math.round(METHOD_NOISE[filter.predictMethod] * 1000) / 10
  const tomorrow = predicted[predicted.length - 1] ?? base
  return {
    dates,
    actual,
    predicted,
    corrected,
    tomorrow,
    mape,
    unit: filter.predictScope === 'line' ? '人次' : '人次',
    deviation: filter.enableCorrection ? Math.round((4 + rnd() * 6) * 10) / 10 : 0,
  }
}

export function genPeakSuggestions(filter: FilterState) {
  const max = identifyMaxSection(filter)
  const pred = genPredictionData(filter)
  const load = max.loadRate
  const suggestions = [
    {
      title: '加密行车间隔',
      detail: `${max.peakTime} 前后 ${max.direction} ${max.from}—${max.to} 建议间隔由 8 分压至 6 分`,
      effect: `峰值满载预计降至 ${Math.max(95, load - 18)}%`,
    },
    {
      title: '增开临客',
      detail: `晚高峰建议增开 ${load > 110 ? 2 : 1} 列临客，覆盖 ${max.from.replace('站', '')}—${max.to.replace('站', '')} 区段`,
      effect: `预计疏解约 ${Math.round(max.flow * 0.14)} 人次`,
    },
    {
      title: '站台限流引导',
      detail: `${max.from}、台州火车站启动分区进站引导`,
      effect: '站台拥挤度下降约 12%',
    },
    {
      title: '乘客分流提示',
      detail: '通过 App/广播引导部分乘客错峰或改乘公交接驳',
      effect: `高峰进站峰值 -${Math.round(4 + pred.mape / 4)}%`,
    },
  ]
  return { max, suggestions, tomorrow: pred.tomorrow }
}

export function getOverviewMetrics(filter: FilterState) {
  const flow = genLineFlowData(filter)
  const cmp = genCompareTrend(filter, filter.comparePeriod)
  const max = identifyMaxSection(filter)
  const total = flow.totalEntry + flow.totalExit
  return {
    metrics: [
      {
        label: '分析期总客流',
        value: total.toLocaleString(),
        unit: '人次',
        trend: cmp.mom,
        color: 'cyan' as const,
      },
      {
        label: '进站总量',
        value: flow.totalEntry.toLocaleString(),
        unit: '人次',
        trend: cmp.metrics[1].mom,
        color: 'green' as const,
      },
      {
        label: '峰值满载',
        value: String(max.loadRate),
        unit: '%',
        trend: max.loadRate > 100 ? 2.1 : -0.6,
        color: (max.loadRate > 100 ? 'red' : 'orange') as 'red' | 'orange',
      },
      {
        label: '超载断面',
        value: max.loadRate > 100 ? 1 : 0,
        unit: '处',
        trend: -1,
        color: 'red' as const,
      },
    ],
    compare: cmp,
    max,
  }
}
