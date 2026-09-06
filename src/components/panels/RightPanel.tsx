import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { ArrowDown, ArrowUp, Info, Lightbulb, AlertTriangle } from 'lucide-react'
import { useAppStore, getStationName } from '@/store/useAppStore'
import {
  VIEW_MODE_LABELS,
} from '@/data/stations'
import {
  ALERTS,
  getStationRankData,
  getChannelShare,
  getOverviewMetrics,
  genLineFlowData,
  genOdMatrix,
  genPeakHourCompare,
  genSectionRates,
  identifyMaxSection,
} from '@/data/mockData'
import {
  LineFlowChart,
  SectionChart,
  StationRankChart,
  HeatmapChart,
  GaugeChart,
  ImbalanceRadar,
  DayTypeCompareChart,
  ChannelPieChart,
  OdMatrixChart,
  PeakHourCompareChart,
  CompareTrendChart,
} from '@/components/charts/AnalysisCharts'
import DataHubPanel from '@/components/data/DataHubPanel'
import HudPanel from '@/components/ui/HudPanel'
import type { MetricItem, ViewMode } from '@/types'

function Trend({ v }: { v: number }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] ${v >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((m) => (
        <div
          key={m.label}
          className={`rounded-sm border bg-gradient-to-br px-2 py-1.5 ${colorMap[m.color]}`}
        >
          <div className="flex items-start justify-between gap-1">
            <span className="text-[9px] text-slate-500">{m.label}</span>
            {m.trend !== undefined && <Trend v={m.trend} />}
          </div>
          <div className={`mt-0.5 font-mono text-base font-bold leading-none ${textMap[m.color]}`}>
            {m.value}
            {m.unit && <span className="ml-0.5 text-[9px] font-normal text-slate-500">{m.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function InsightCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-sm border border-cyan-500/20 bg-slate-950/30 p-2.5 shadow-[inset_0_1px_0_rgba(34,211,238,0.08)]">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-cyan-300/90">
        <Lightbulb size={12} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
        {title}
      </div>
      {children}
    </div>
  )
}

function RankList({ limit = 5 }: { limit?: number }) {
  const filter = useAppStore((s) => s.filter)
  const ranks = useMemo(() => getStationRankData(filter).slice(0, limit), [filter, limit])
  const max = ranks[0]?.entry ?? 1
  return (
    <div className="space-y-1.5">
      {ranks.map((r, i) => (
        <div key={r.name} className="flex items-center gap-2 text-[11px]">
          <span
            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[9px] font-bold ${
              i < 3 ? 'bg-cyan-500/25 text-cyan-300' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {i + 1}
          </span>
          <span className="w-14 truncate text-slate-300">{r.name.replace('站', '')}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500"
              style={{ width: `${(r.entry / max) * 100}%` }}
            />
          </div>
          <span className="w-10 text-right font-mono text-slate-400">
            {(r.entry / 1000).toFixed(1)}k
          </span>
        </div>
      ))}
    </div>
  )
}

function AlertList({ levels }: { levels?: Array<'info' | 'warning' | 'danger'> }) {
  const list = levels ? ALERTS.filter((a) => levels.includes(a.level)) : ALERTS
  const icons = { info: Info, warning: AlertTriangle, danger: AlertTriangle }
  const colors = {
    info: 'border-blue-500/25 bg-blue-500/5 text-blue-300',
    warning: 'border-amber-500/25 bg-amber-500/5 text-amber-300',
    danger: 'border-red-500/25 bg-red-500/5 text-red-300',
  }

  return (
    <div className="space-y-1.5">
      {list.slice(0, 2).map((a) => {
        const Icon = icons[a.level]
        return (
          <div key={a.id} className={`flex gap-2 rounded-md border p-2 text-[11px] ${colors[a.level]}`}>
            <Icon size={13} className="mt-0.5 flex-shrink-0" />
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

function ContextBar() {
  const viewMode = useAppStore((s) => s.viewMode)
  const selectedStationId = useAppStore((s) => s.selectedStationId)
  const sectionStationIds = useAppStore((s) => s.sectionStationIds)
  const filter = useAppStore((s) => s.filter)

  if (viewMode === 'acc-data') return null

  const channelLabel =
    filter.dataChannel === 'acc'
      ? 'ACC'
      : filter.dataChannel === 'internet'
        ? '互联网'
        : '全部票种'

  const dateLabel =
    filter.dateRange.start === filter.dateRange.end
      ? filter.dateRange.start
      : `${filter.dateRange.start} ~ ${filter.dateRange.end}`

  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      <span className="chip">日期 {dateLabel}</span>
      <span className="chip">
        时段 {filter.timeRange.start}–{filter.timeRange.end}
      </span>
      {viewMode === 'line-flow' && <span className="chip">{channelLabel}</span>}
      {selectedStationId &&
        viewMode !== 'section-flow' &&
        viewMode !== 'line-flow' && (
          <span className="chip chip-accent">{getStationName(selectedStationId)}</span>
        )}
      {viewMode === 'section-flow' && sectionStationIds.length === 2 && (
        <span className="chip chip-purple">
          {getStationName(sectionStationIds[0])} → {getStationName(sectionStationIds[1])}
        </span>
      )}
      {(viewMode === 'section-flow' || viewMode === 'imbalance') && (
        <span className="chip">{filter.direction === 'up' ? '上行' : '下行'}</span>
      )}
    </div>
  )
}

function OverviewView() {
  const filter = useAppStore((s) => s.filter)
  const overview = useMemo(() => getOverviewMetrics(filter), [filter])
  const peak = useMemo(() => genPeakHourCompare(filter), [filter])

  return (
    <div className="space-y-2">
      <KpiStrip items={overview.metrics} />
      <div>
        <div className="section-label !mb-1">环比对比</div>
        <CompareTrendChart height={100} />
        <div className="mt-1 flex justify-center gap-3 text-[9px] text-slate-500">
          <span>环比 <Trend v={overview.compare.mom} /></span>
          <span>同比 <Trend v={overview.compare.yoy} /></span>
        </div>
      </div>
      <div>
        <div className="section-label !mb-1">分时客流</div>
        <LineFlowChart height={108} stationId={null} />
      </div>
      <div>
        <div className="section-label !mb-1">工作日 / 周末对比</div>
        <DayTypeCompareChart height={108} />
      </div>
      <InsightCard title="运营洞察">
        <ul className="space-y-0.5 text-[10px] leading-snug text-slate-400">
          <li>· 早高峰峰值 {peak.morningHour}，晚高峰峰值 {peak.eveningHour}</li>
          <li>· 最大断面：{overview.max.from} → {overview.max.to}（{overview.max.direction}）</li>
          <li>· 峰值满载 {overview.max.loadRate}%</li>
        </ul>
      </InsightCard>
      <AlertList levels={['danger', 'warning']} />
    </div>
  )
}

function LineFlowView() {
  const filter = useAppStore((s) => s.filter)
  const flow = useMemo(() => genLineFlowData(filter, null), [filter])
  const share = useMemo(() => getChannelShare(filter), [filter])
  const od = useMemo(() => genOdMatrix(filter, 8), [filter])
  const peak = useMemo(() => genPeakHourCompare(filter), [filter])
  const days = Math.max(
    1,
    Math.round(
      (new Date(filter.dateRange.end).getTime() - new Date(filter.dateRange.start).getTime()) /
        86400000,
    ) + 1,
  )
  const peakEntry = Math.max(...flow.entry, 0)

  return (
    <div className="space-y-3">
      <KpiStrip
        items={[
          { label: '进站总量', value: flow.totalEntry.toLocaleString(), unit: '人次', trend: 2.4, color: 'cyan' },
          { label: '出站总量', value: flow.totalExit.toLocaleString(), unit: '人次', trend: 1.9, color: 'green' },
          {
            label: '日均客流',
            value: ((flow.totalEntry + flow.totalExit) / days / 10000).toFixed(1),
            unit: '万',
            trend: 3.2,
            color: 'orange',
          },
          { label: '峰值进站', value: peakEntry.toLocaleString(), unit: '人次', trend: 4.1, color: 'red' },
        ]}
      />
      <div>
        <div className="section-label">分时进出站对比</div>
        <LineFlowChart height={160} stationId={null} />
      </div>
      <div>
        <div className="section-label">高峰时段对比（早 {peak.morningHour} / 晚 {peak.eveningHour}）</div>
        <PeakHourCompareChart height={140} />
      </div>
      <div>
        <div className="section-label">日期类型客流特征</div>
        <DayTypeCompareChart height={130} />
      </div>
      <div>
        <div className="section-label">票种占比</div>
        <ChannelPieChart height={120} />
        <div className="mt-1 text-center text-[10px] text-slate-500">
          {share.map((s) => `${s.name} ${s.value}%`).join(' · ')}
        </div>
      </div>
      <div>
        <div className="section-label">OD 矩阵（前 8 站）</div>
        <OdMatrixChart height={200} />
      </div>
      <InsightCard title="OD Top5">
        <div className="space-y-1.5">
          {od.top.map((item, i) => (
            <div key={item.from + item.to} className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="w-4 text-cyan-400/80">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">
                {item.from.replace('站', '')} → {item.to.replace('站', '')}
              </span>
              <span className="font-mono text-cyan-200">{item.flow.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </InsightCard>
      <InsightCard title="客流热点站 TOP5">
        <RankList limit={5} />
      </InsightCard>
    </div>
  )
}

function SectionFlowView() {
  const filter = useAppStore((s) => s.filter)
  const sectionStationIds = useAppStore((s) => s.sectionStationIds)
  const sectionSegmentId = useAppStore((s) => s.sectionSegmentId)
  const ready = Boolean(sectionSegmentId) && sectionStationIds.length === 2
  const maxSection = useMemo(() => identifyMaxSection(filter), [filter])
  const series = useMemo(
    () => (ready ? genSectionRates(filter, sectionSegmentId) : []),
    [filter, sectionSegmentId, ready],
  )
  const peakRate = series.length ? Math.max(...series.map((d) => d.rate)) : maxSection.loadRate
  const overload = series.filter((d) => d.rate > 100).length

  return (
    <div className="space-y-3">
      <InsightCard title="全天最大断面（自动识别）">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <div className="text-slate-500">区间</div>
            <div className="font-medium text-cyan-200">
              {maxSection.from} → {maxSection.to}
            </div>
          </div>
          <div>
            <div className="text-slate-500">方向 / 峰值时刻</div>
            <div className="text-slate-200">
              {maxSection.direction} · {maxSection.peakTime}
            </div>
          </div>
          <div>
            <div className="text-slate-500">断面客流</div>
            <div className="font-mono text-lg font-bold text-amber-300">
              {maxSection.flow.toLocaleString()}
              <span className="ml-1 text-[10px] font-normal text-slate-500">人次</span>
            </div>
          </div>
          <div>
            <div className="text-slate-500">满载率</div>
            <div className="font-mono text-lg font-bold text-red-300">{maxSection.loadRate}%</div>
          </div>
        </div>
      </InsightCard>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-1 pb-2 pt-1">
          <GaugeChart value={peakRate} label="峰值满载" height={168} />
        </div>
        <div className="flex flex-col justify-center gap-2">
          {[
            { label: '当前满载', value: `${Math.round(peakRate * 0.74)}%`, tone: 'text-amber-300' },
            { label: '超载时段', value: `${overload} 个`, tone: 'text-red-300' },
            { label: '建议加开', value: `${peakRate > 110 ? 2 : 1} 列`, tone: 'text-cyan-300' },
          ].map((x) => (
            <div key={x.label} className="rounded-md bg-slate-950/50 px-2.5 py-2">
              <div className="text-[10px] text-slate-500">{x.label}</div>
              <div className={`font-mono text-lg font-bold ${x.tone}`}>{x.value}</div>
            </div>
          ))}
        </div>
      </div>

      {!ready ? (
        <div className="rounded-md border border-dashed border-cyan-500/25 bg-slate-950/30 px-3 py-6 text-center text-[12px] text-slate-500">
          请在左侧选择断面线段，或在地图上点选两个相邻站点
        </div>
      ) : (
        <>
          <div>
            <div className="section-label">断面满载率曲线</div>
            <SectionChart height={160} />
          </div>
          <InsightCard title="警戒说明">
            <div className="flex gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-400" /> ≤80% 正常</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-400" /> 80–100% 预警</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-red-400" /> &gt;100% 超载</span>
            </div>
          </InsightCard>
          <AlertList levels={['danger', 'warning']} />
        </>
      )}
    </div>
  )
}

function StationFlowView() {
  const selectedId = useAppStore((s) => s.selectedStationId)
  const filter = useAppStore((s) => s.filter)
  const name = selectedId ? getStationName(selectedId) : '未选站'
  const flow = useMemo(() => genLineFlowData(filter, selectedId), [filter, selectedId])

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
        <div className="text-[10px] text-slate-500">当前站点</div>
        <div className="text-sm font-semibold text-cyan-200">{name}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '进站', value: `${(flow.totalEntry / 1000).toFixed(1)}k` },
          { label: '出站', value: `${(flow.totalExit / 1000).toFixed(1)}k` },
          { label: '换乘', value: `${(flow.totalEntry * 0.12 / 1000).toFixed(1)}k` },
        ].map((x) => (
          <div key={x.label} className="rounded-md bg-slate-950/50 px-2 py-2 text-center">
            <div className="text-[10px] text-slate-500">{x.label}</div>
            <div className="font-mono text-base font-bold text-slate-100">{x.value}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="section-label">分时进出站</div>
        <LineFlowChart height={150} stationId={selectedId} />
      </div>
      <div>
        <div className="section-label">站点客流排名</div>
        <StationRankChart height={180} />
      </div>
    </div>
  )
}

function PeakPlatformView() {
  const filter = useAppStore((s) => s.filter)
  const peak = useMemo(() => genPeakHourCompare(filter), [filter])
  const ranks = useMemo(() => getStationRankData(filter).slice(0, 3), [filter])

  return (
    <div className="space-y-3">
      <div>
        <div className="section-label">站台分时热力</div>
        <HeatmapChart height={190} />
      </div>
      <div>
        <div className="section-label">高峰时段对比</div>
        <PeakHourCompareChart height={140} />
      </div>
      <InsightCard title="高峰时段识别">
        <ul className="space-y-1 text-[11px] text-slate-400">
          <li>· 早高峰峰值小时：{peak.morningHour}，重点站：{ranks[0]?.name}、{ranks[1]?.name}</li>
          <li>· 晚高峰峰值小时：{peak.eveningHour}，重点站：{ranks[0]?.name}、{ranks[2]?.name}</li>
          <li>· 早高峰量 {peak.values[0].toLocaleString()} · 晚高峰量 {peak.values[1].toLocaleString()}</li>
        </ul>
      </InsightCard>
      <AlertList levels={['warning', 'danger']} />
    </div>
  )
}

function ImbalanceView() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: '方向不均衡', value: '1.35', tip: '下行偏高' },
          { label: '断面不均衡', value: '1.62', tip: '中段偏高' },
          { label: '时段不均衡', value: '1.48', tip: '双峰明显' },
          { label: '站点不均衡', value: '1.22', tip: '两端集中' },
        ].map((x) => (
          <div key={x.label} className="rounded-md border border-cyan-500/15 bg-slate-950/40 px-2.5 py-2">
            <div className="text-[10px] text-slate-500">{x.label}</div>
            <div className="font-mono text-xl font-bold text-violet-300">{x.value}</div>
            <div className="text-[10px] text-slate-500">{x.tip}</div>
          </div>
        ))}
      </div>
      <ImbalanceRadar height={170} />
      <div>
        <div className="section-label">时段满载波动</div>
        <SectionChart height={140} />
      </div>
      <InsightCard title="调优建议">
        <p className="text-[11px] leading-relaxed text-slate-400">
          断面不均衡指数偏高，建议在温岭火车站—汇川王站区间增加折返运力，并优化早晚高峰交路。
        </p>
      </InsightCard>
    </div>
  )
}

function AccDataView() {
  return <DataHubPanel />
}

const VIEWS: Record<Exclude<ViewMode, 'prediction'>, () => ReactNode> = {
  overview: OverviewView,
  'line-flow': LineFlowView,
  'section-flow': SectionFlowView,
  'station-flow': StationFlowView,
  'peak-platform': PeakPlatformView,
  imbalance: ImbalanceView,
  'acc-data': AccDataView,
}

export default function RightPanel() {
  const viewMode = useAppStore((s) => s.viewMode)
  const loading = useAppStore((s) => s.loading)
  const View =
    viewMode === 'prediction'
      ? VIEWS.overview
      : VIEWS[viewMode as Exclude<ViewMode, 'prediction'>] ?? VIEWS.overview
  const panelTitle =
    viewMode === 'prediction'
      ? VIEW_MODE_LABELS.overview
      : viewMode === 'acc-data'
        ? '数据中心'
        : VIEW_MODE_LABELS[viewMode]
  const panelTitleEn =
    viewMode === 'acc-data' ? 'DATA HUB · ETL BASE' : 'ANALYSIS · VISUALIZATION'

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden">
      <HudPanel
        className="flex min-h-0 flex-1 flex-col overflow-hidden p-2.5"
        title={panelTitle}
        titleEn={panelTitleEn}
        extra={
          loading ? (
            <span className="animate-pulse text-[10px] text-cyan-400">分析中…</span>
          ) : (
            <span className="rounded-sm border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
              LIVE
            </span>
          )
        }
      >
        <ContextBar />
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-0.5">
          <View />
        </div>
      </HudPanel>
    </aside>
  )
}
