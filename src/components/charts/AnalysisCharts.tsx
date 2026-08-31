import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import { useAppStore } from '@/store/useAppStore'
import {
  genLineFlowData,
  genSectionRates,
  genPredictionData,
  genDayTypeCompareData,
  getStationRankData,
  getHeatmapData,
  getChannelShare,
  genOdMatrix,
  genPeakHourCompare,
  genCompareTrend,
} from '@/data/mockData'
import { darkChartTheme, chartColors, glowLine, glowArea } from './ChartTheme'

export function LineFlowChart({
  height = 180,
  stationId,
}: {
  height?: number
  stationId?: string | null
}) {
  const filter = useAppStore((s) => s.filter)
  const selectedId = useAppStore((s) => s.selectedStationId)
  const sid = stationId === undefined ? null : stationId ?? selectedId
  const data = useMemo(
    () => genLineFlowData(filter, sid),
    [filter, sid],
  )
  const option = {
    ...darkChartTheme,
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['进站', '出站'],
      textStyle: { color: '#94a3b8', fontSize: 10 },
      top: 0,
      right: 0,
    },
    grid: { left: 36, right: 8, top: 28, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.hours,
      axisLabel: { fontSize: 8, color: '#64748b', interval: 1 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: {
        fontSize: 9,
        color: '#64748b',
        formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
      },
    },
    series: [
      {
        name: '进站',
        type: 'bar',
        data: data.entry,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: chartColors.cyan },
              { offset: 1, color: 'rgba(34,211,238,0.2)' },
            ],
          },
          borderRadius: [2, 2, 0, 0],
        },
        barWidth: '30%',
      },
      {
        name: '出站',
        type: 'bar',
        data: data.exit,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: chartColors.green },
              { offset: 1, color: 'rgba(52,211,153,0.2)' },
            ],
          },
          borderRadius: [2, 2, 0, 0],
        },
        barWidth: '30%',
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} opts={{ renderer: 'canvas' }} notMerge />
}

export function SectionChart({ height = 180 }: { height?: number }) {
  const filter = useAppStore((s) => s.filter)
  const segmentId = useAppStore((s) => s.sectionSegmentId)
  const data = useMemo(() => genSectionRates(filter, segmentId), [filter, segmentId])
  const option = {
    ...darkChartTheme,
    tooltip: {
      trigger: 'axis',
      formatter: (p: { name: string; value: number }[]) => `${p[0].name}: ${p[0].value}%`,
    },
    grid: { left: 40, right: 10, top: 16, bottom: 32 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.time),
      axisLabel: { fontSize: 8, color: '#64748b', rotate: 30 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      max: 150,
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { fontSize: 9, color: '#64748b', formatter: '{value}%' },
    },
    visualMap: {
      show: false,
      pieces: [
        { lte: 80, color: chartColors.green },
        { gt: 80, lte: 100, color: chartColors.amber },
        { gt: 100, color: chartColors.red },
      ],
      seriesIndex: 0,
    },
    series: [
      {
        type: 'line',
        data: data.map((d) => d.rate),
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.12 },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            { yAxis: 80, label: { formatter: '预警', fontSize: 9, color: chartColors.amber }, lineStyle: { color: chartColors.amber, type: 'dashed' } },
            { yAxis: 100, label: { formatter: '满载', fontSize: 9, color: chartColors.red }, lineStyle: { color: chartColors.red, type: 'dashed' } },
          ],
        },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function PredictionChart({
  height = 180,
  showCorrection = false,
}: {
  height?: number
  showCorrection?: boolean
}) {
  const filter = useAppStore((s) => s.filter)
  const selectedId = useAppStore((s) => s.selectedStationId)
  const segmentId = useAppStore((s) => s.sectionSegmentId)
  const data = useMemo(
    () =>
      genPredictionData(filter, {
        stationId: selectedId,
        segmentId,
        days: 7,
      }),
    [filter, selectedId, segmentId],
  )
  const legend = showCorrection ? ['实际', '预测', '校正后'] : ['实际', '预测']
  const yFmt =
    filter.predictScope === 'line'
      ? (v: number) => `${(v / 10000).toFixed(0)}万`
      : (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))

  const option = {
    ...darkChartTheme,
    tooltip: { trigger: 'axis' },
    legend: {
      data: legend,
      textStyle: { color: '#94a3b8', fontSize: 10 },
      top: 0,
      right: 0,
    },
    grid: { left: 44, right: 8, top: 28, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.dates,
      axisLabel: { fontSize: 9, color: '#64748b' },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { fontSize: 9, color: '#64748b', formatter: yFmt },
    },
    series: [
      {
        name: '实际',
        type: 'line',
        data: data.actual.map((v) => (v === 0 ? null : v)),
        itemStyle: { color: chartColors.cyan },
        lineStyle: glowLine(chartColors.cyan, 2.2),
        smooth: true,
        symbol: 'none',
        areaStyle: glowArea(chartColors.cyan, 0.12),
      },
      {
        name: '预测',
        type: 'line',
        data: data.predicted,
        itemStyle: { color: chartColors.purple },
        lineStyle: { ...glowLine(chartColors.purple, 2), type: 'dashed' },
        smooth: true,
        symbol: 'none',
      },
      ...(showCorrection
        ? [
            {
              name: '校正后',
              type: 'line',
              data: data.corrected,
              itemStyle: { color: chartColors.amber },
              lineStyle: glowLine(chartColors.amber, 2),
              smooth: true,
              symbol: 'none',
            },
          ]
        : []),
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function DayTypeCompareChart({ height = 170 }: { height?: number }) {
  const filter = useAppStore((s) => s.filter)
  const data = useMemo(() => genDayTypeCompareData(filter), [filter])
  const option = {
    ...darkChartTheme,
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['工作日', '周末', '节假日'],
      textStyle: { color: '#94a3b8', fontSize: 10 },
      top: 0,
      right: 0,
    },
    grid: { left: 40, right: 8, top: 28, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.hours,
      axisLabel: { fontSize: 8, color: '#64748b', interval: 1 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: {
        fontSize: 9,
        color: '#64748b',
        formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
      },
    },
    series: [
      {
        name: '工作日',
        type: 'line',
        data: data.workday,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: chartColors.cyan },
        lineStyle: glowLine(chartColors.cyan, 2.2),
        areaStyle: glowArea(chartColors.cyan, 0.14),
      },
      {
        name: '周末',
        type: 'line',
        data: data.weekend,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: chartColors.purple },
        lineStyle: glowLine(chartColors.purple, 2),
      },
      {
        name: '节假日',
        type: 'line',
        data: data.holiday,
        smooth: true,
        symbol: 'none',
        lineStyle: { ...glowLine(chartColors.amber, 1.8), type: 'dashed' },
        itemStyle: { color: chartColors.amber },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function ChannelPieChart({ height = 150 }: { height?: number }) {
  const filter = useAppStore((s) => s.filter)
  const share = useMemo(() => getChannelShare(filter), [filter])
  const option = {
    ...darkChartTheme,
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: {
      orient: 'vertical',
      right: 4,
      top: 'middle',
      textStyle: { color: '#94a3b8', fontSize: 10 },
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['35%', '50%'],
        label: { show: false },
        data: share.map((d, i) => ({
          ...d,
          itemStyle: { color: i === 0 ? chartColors.cyan : chartColors.purple },
        })),
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function TicketPieChart({ height = 150 }: { height?: number }) {
  return <ChannelPieChart height={height} />
}

export function PeakHourCompareChart({ height = 150 }: { height?: number }) {
  const filter = useAppStore((s) => s.filter)
  const data = useMemo(() => genPeakHourCompare(filter), [filter])
  const option = {
    ...darkChartTheme,
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['全日', '早高峰窗', '晚高峰窗'],
      textStyle: { color: '#94a3b8', fontSize: 10 },
      top: 0,
      right: 0,
    },
    grid: { left: 40, right: 8, top: 28, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.hours,
      axisLabel: { fontSize: 8, color: '#64748b', interval: 1 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: {
        fontSize: 9,
        color: '#64748b',
        formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
      },
    },
    series: [
      {
        name: '全日',
        type: 'line',
        data: data.allSeries,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: '#64748b' },
        lineStyle: { width: 1, type: 'dotted' },
      },
      {
        name: '早高峰窗',
        type: 'bar',
        data: data.morningSeries,
        itemStyle: { color: chartColors.cyan },
        barWidth: '35%',
      },
      {
        name: '晚高峰窗',
        type: 'bar',
        data: data.eveningSeries,
        itemStyle: { color: chartColors.amber },
        barWidth: '35%',
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function OdMatrixChart({ height = 200 }: { height?: number }) {
  const filter = useAppStore((s) => s.filter)
  const od = useMemo(() => genOdMatrix(filter, 8), [filter])
  const data = od.matrix.flatMap((row, i) => row.map((v, j) => [j, i, v || '-']))
  const option = {
    ...darkChartTheme,
    tooltip: {
      position: 'top',
      formatter: (p: { data: [number, number, number] }) =>
        `${od.names[p.data[1]]} → ${od.names[p.data[0]]}: ${p.data[2]}`,
    },
    grid: { left: 48, right: 16, top: 8, bottom: 40 },
    xAxis: {
      type: 'category',
      data: od.names,
      axisLabel: { fontSize: 8, color: '#64748b', rotate: 35 },
      splitArea: { show: false },
    },
    yAxis: {
      type: 'category',
      data: od.names,
      axisLabel: { fontSize: 8, color: '#64748b' },
      splitArea: { show: false },
    },
    visualMap: {
      min: 0,
      max: Math.max(...od.matrix.flat(), 1),
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { color: '#64748b', fontSize: 9 },
      inRange: { color: ['#0f172a', '#164e63', '#22d3ee', '#fbbf24'] },
    },
    series: [
      {
        type: 'heatmap',
        data,
        label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(34,211,238,0.4)' } },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function CompareTrendChart({ height = 120 }: { height?: number }) {
  const filter = useAppStore((s) => s.filter)
  const data = useMemo(() => genCompareTrend(filter, filter.comparePeriod), [filter])
  const option = {
    ...darkChartTheme,
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 12, top: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: {
        fontSize: 9,
        color: '#64748b',
        formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
      },
    },
    series: [
      {
        type: 'bar',
        data: data.values,
        barWidth: 36,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: chartColors.cyan },
              { offset: 1, color: 'rgba(34,211,238,0.25)' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          color: '#94a3b8',
          fontSize: 9,
          formatter: (p: { value: number }) => p.value.toLocaleString(),
        },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function MiniSparkline({ data, color = chartColors.cyan }: { data: number[]; color?: string }) {
  const option = {
    grid: { left: 0, right: 0, top: 4, bottom: 0 },
    xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}55` },
              { offset: 1, color: `${color}00` },
            ],
          },
        },
      },
    ],
  }
  return <ReactECharts option={option} style={{ height: 36 }} opts={{ renderer: 'canvas' }} />
}

export function StationRankChart({ height = 200 }: { height?: number }) {
  const filter = useAppStore((s) => s.filter)
  const data = useMemo(() => getStationRankData(filter).slice(0, 8).reverse(), [filter])
  const option = {
    ...darkChartTheme,
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['进站', '出站'],
      textStyle: { fontSize: 10, color: '#94a3b8' },
      top: 0,
      right: 0,
    },
    grid: { left: 56, right: 12, top: 28, bottom: 8 },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { fontSize: 9, color: '#64748b' },
    },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.name.replace('站', '')),
      axisLabel: { fontSize: 9, color: '#94a3b8' },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        name: '进站',
        type: 'bar',
        data: data.map((d) => d.entry),
        itemStyle: { color: chartColors.cyan, borderRadius: [0, 3, 3, 0] },
        barWidth: 8,
      },
      {
        name: '出站',
        type: 'bar',
        data: data.map((d) => d.exit),
        itemStyle: { color: chartColors.green, borderRadius: [0, 3, 3, 0] },
        barWidth: 8,
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function HeatmapChart({ height = 180 }: { height?: number }) {
  const filter = useAppStore((s) => s.filter)
  const { hours, stationNames, data } = useMemo(() => getHeatmapData(filter), [filter])
  const option = {
    ...darkChartTheme,
    tooltip: {
      position: 'top',
      formatter: (p: { data: [number, number, number] }) =>
        `${stationNames[p.data[1]]} ${hours[p.data[0]]}:00 · ${p.data[2]}`,
    },
    grid: { left: 52, right: 12, top: 8, bottom: 28 },
    xAxis: {
      type: 'category',
      data: hours,
      axisLabel: { fontSize: 8, color: '#64748b' },
    },
    yAxis: {
      type: 'category',
      data: stationNames,
      axisLabel: { fontSize: 8, color: '#94a3b8' },
    },
    visualMap: {
      min: 0,
      max: 2500,
      show: false,
      inRange: { color: ['#0f172a', '#164e63', '#22d3ee', '#fbbf24', '#f87171'] },
    },
    series: [{ type: 'heatmap', data, emphasis: { itemStyle: { borderColor: '#67e8f9', borderWidth: 1 } } }],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function GaugeChart({
  value,
  label = '满载率',
  height = 160,
}: {
  value: number
  label?: string
  height?: number
}) {
  const color =
    value > 100 ? chartColors.red : value > 80 ? chartColors.amber : chartColors.green
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 150,
        splitNumber: 5,
        radius: '78%',
        center: ['50%', '55%'],
        axisLine: {
          lineStyle: {
            width: 10,
            color: [
              [80 / 150, chartColors.green],
              [100 / 150, chartColors.amber],
              [1, chartColors.red],
            ],
          },
        },
        pointer: {
          width: 3,
          length: '55%',
          itemStyle: { color },
        },
        anchor: {
          show: true,
          size: 5,
          itemStyle: { color },
        },
        axisTick: { show: false },
        splitLine: {
          length: 6,
          distance: 2,
          lineStyle: { width: 1.5, color: '#475569' },
        },
        // 刻度放在环外侧，避免压住中心数值
        axisLabel: {
          color: '#64748b',
          fontSize: 9,
          distance: -18,
          formatter: (v: number) => (v % 30 === 0 ? String(v) : ''),
        },
        title: {
          show: true,
          offsetCenter: [0, '72%'],
          color: '#94a3b8',
          fontSize: 10,
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          color,
          fontSize: 20,
          fontWeight: 700,
          offsetCenter: [0, '18%'],
        },
        data: [{ value: Math.round(value), name: label }],
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}

export function ImbalanceRadar({ height = 180 }: { height?: number }) {
  const filter = useAppStore((s) => s.filter)
  const values = useMemo(() => {
    const max = genSectionRates(filter, null)
    const peak = Math.max(...max.map((d) => d.rate))
    return [
      filter.direction === 'down' ? 1.35 : 1.18,
      +(1.2 + peak / 200).toFixed(2),
      1.48,
      1.22,
      filter.dataChannel === 'acc' ? 1.15 : filter.dataChannel === 'internet' ? 1.28 : 1.08,
    ]
  }, [filter])

  const option = {
    ...darkChartTheme,
    radar: {
      indicator: [
        { name: '方向', max: 2 },
        { name: '断面', max: 2 },
        { name: '时段', max: 2 },
        { name: '站点', max: 2 },
        { name: '票种', max: 2 },
      ],
      center: ['50%', '55%'],
      radius: '65%',
      axisName: { color: '#94a3b8', fontSize: 10 },
      splitArea: { areaStyle: { color: ['rgba(34,211,238,0.02)', 'rgba(34,211,238,0.06)'] } },
      splitLine: { lineStyle: { color: '#334155' } },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            name: '不均衡指数',
            areaStyle: { color: 'rgba(167,139,250,0.25)' },
            lineStyle: { color: chartColors.purple },
            itemStyle: { color: chartColors.purple },
          },
        ],
      },
    ],
  }
  return <ReactECharts option={option} style={{ height }} notMerge />
}
