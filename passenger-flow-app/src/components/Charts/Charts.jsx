import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'

const STYLE = { height: '100%', width: '100%' }

/* ── Shared theme ── */
const baseGrid = { left: 44, right: 12, top: 32, bottom: 28, containLabel: false }
const axisLabel = { color: '#7a9cc4', fontSize: 10 }
const splitLine = { lineStyle: { color: 'rgba(79,142,247,.08)' } }

/* ── Flow Trend Chart ── */
export function FlowTrendChart({ data = [] }) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(7,20,40,.95)',
      borderColor: 'rgba(79,142,247,.3)',
      textStyle: { color: '#e8f0ff', fontSize: 12 },
      axisPointer: { type: 'cross', crossStyle: { color: 'rgba(79,142,247,.4)' } },
    },
    legend: {
      top: 4, right: 4,
      textStyle: { color: '#7a9cc4', fontSize: 10 },
      itemWidth: 12, itemHeight: 3,
      data: ['进站量', '出站量'],
    },
    grid: baseGrid,
    xAxis: {
      type: 'category',
      data: data.map(d => d.hour),
      axisLabel: { ...axisLabel, interval: 2 },
      axisLine: { lineStyle: { color: 'rgba(79,142,247,.15)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...axisLabel, formatter: v => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v },
      splitLine,
    },
    series: [
      {
        name: '进站量', type: 'bar', barWidth: '35%',
        data: data.map(d => d.entry),
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#4f8ef7' }, { offset: 1, color: 'rgba(79,142,247,.15)' }] } },
      },
      {
        name: '出站量', type: 'bar', barWidth: '35%',
        data: data.map(d => d.exit),
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#00e5a0' }, { offset: 1, color: 'rgba(0,229,160,.1)' }] } },
      },
    ],
  }), [data])
  return <ReactECharts option={option} style={STYLE} notMerge />
}

/* ── Load Rate Chart ── */
export function LoadRateChart({ data = [] }) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(7,20,40,.95)',
      borderColor: 'rgba(79,142,247,.3)',
      textStyle: { color: '#e8f0ff', fontSize: 12 },
      formatter: p => `${p[0].name}<br/>满载率: <b>${p[0].value}%</b>`,
    },
    grid: baseGrid,
    xAxis: {
      type: 'category',
      data: data.map(d => d.hour),
      axisLabel: { ...axisLabel, interval: 2 },
      axisLine: { lineStyle: { color: 'rgba(79,142,247,.15)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value', max: 140,
      axisLabel: { ...axisLabel, formatter: '{value}%' },
      splitLine,
    },
    visualMap: {
      show: false, seriesIndex: 0,
      pieces: [
        { lte: 70,  color: '#00e5a0' },
        { gt: 70, lte: 90,  color: '#4f8ef7' },
        { gt: 90, lte: 110, color: '#ffaa2c' },
        { gt: 110, color: '#ff4d6a' },
      ],
    },
    series: [{
      type: 'line', smooth: true, data: data.map(d => d.loadRate),
      lineStyle: { width: 3 },
      areaStyle: { opacity: .15 },
      symbol: 'circle', symbolSize: 5,
      markLine: {
        silent: true,
        data: [
          { yAxis: 90,  lineStyle: { color: '#ffaa2c', type: 'dashed', width: 1 }, label: { formatter: '90% 预警', color: '#ffaa2c', fontSize: 10 } },
          { yAxis: 110, lineStyle: { color: '#ff4d6a', type: 'dashed', width: 1 }, label: { formatter: '110% 超载', color: '#ff4d6a', fontSize: 10 } },
        ],
      },
    }],
  }), [data])
  return <ReactECharts option={option} style={STYLE} notMerge />
}

/* ── Prediction Chart ── */
export function PredictionChart({ data = [] }) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(7,20,40,.95)',
      borderColor: 'rgba(79,142,247,.3)',
      textStyle: { color: '#e8f0ff', fontSize: 12 },
      formatter: params => {
        const p = params.find(p => p.seriesName === '实际客流')
        const q = params.find(p => p.seriesName === '预测客流')
        return `${params[0].name}<br/>
          ${p ? `实际: <b>${p.value?.toLocaleString()}</b><br/>` : ''}
          ${q ? `预测: <b style="color:#7c5cfc">${q.value?.toLocaleString()}</b>` : ''}`
      },
    },
    legend: {
      top: 4, right: 4,
      textStyle: { color: '#7a9cc4', fontSize: 10 },
      itemWidth: 12, itemHeight: 3,
      data: ['实际客流', '预测客流', '置信区间'],
    },
    grid: { ...baseGrid, bottom: 36 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisLabel: { ...axisLabel, rotate: 20 },
      axisLine: { lineStyle: { color: 'rgba(79,142,247,.15)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...axisLabel, formatter: v => (v / 10000).toFixed(0) + '万' },
      splitLine,
    },
    dataZoom: [{ type: 'slider', bottom: 4, height: 16, borderColor: 'rgba(79,142,247,.2)', fillerColor: 'rgba(79,142,247,.08)', handleStyle: { color: '#4f8ef7' }, textStyle: { color: '#7a9cc4' } }],
    series: [
      /* Confidence band - upper */
      {
        name: '置信区间', type: 'line', data: data.map(d => d.upper),
        lineStyle: { opacity: 0 }, stack: 'ci', itemStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(124,92,252,.06)' }, symbol: 'none', emphasis: { disabled: true },
      },
      /* Confidence band - span */
      {
        name: '_ci_low', type: 'line', data: data.map(d => d.upper - d.lower),
        lineStyle: { opacity: 0 }, stack: 'ci',
        areaStyle: { color: 'rgba(124,92,252,.06)' }, symbol: 'none',
        tooltip: { show: false }, emphasis: { disabled: true }, legendHoverLink: false,
      },
      {
        name: '实际客流', type: 'bar', barWidth: '55%',
        data: data.map(d => d.actual),
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(79,142,247,.9)' }, { offset: 1, color: 'rgba(79,142,247,.15)' }] }, borderRadius: [2, 2, 0, 0] },
      },
      {
        name: '预测客流', type: 'line', smooth: true,
        data: data.map(d => d.predict),
        lineStyle: { color: '#7c5cfc', width: 2.5, type: 'dashed' },
        itemStyle: { color: '#7c5cfc' }, symbol: 'circle', symbolSize: 5,
      },
    ],
  }), [data])
  return <ReactECharts option={option} style={STYLE} notMerge />
}

/* ── Imbalance Radar Chart ── */
export function ImbalanceChart({ data = [] }) {
  if (!data.length) return null
  const last = data[data.length - 1]
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: 'rgba(7,20,40,.95)',
      borderColor: 'rgba(79,142,247,.3)',
      textStyle: { color: '#e8f0ff', fontSize: 12 },
    },
    legend: { show: false },
    grid: { ...baseGrid, top: 20 },
    xAxis: {
      type: 'category', data: data.map(d => d.date),
      axisLabel: { ...axisLabel, rotate: 20 },
      axisLine: { lineStyle: { color: 'rgba(79,142,247,.15)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...axisLabel },
      splitLine,
      name: '系数', nameTextStyle: { color: '#7a9cc4', fontSize: 10 },
    },
    series: [
      { name: '方向不均衡', type: 'line', smooth: true, data: data.map(d => d.direction), lineStyle: { color: '#4f8ef7', width: 2 }, itemStyle: { color: '#4f8ef7' }, symbol: 'none', areaStyle: { opacity: .1, color: '#4f8ef7' } },
      { name: '断面不均衡', type: 'line', smooth: true, data: data.map(d => d.section), lineStyle: { color: '#ffaa2c', width: 2 }, itemStyle: { color: '#ffaa2c' }, symbol: 'none', areaStyle: { opacity: .1, color: '#ffaa2c' } },
      { name: '时间不均衡', type: 'line', smooth: true, data: data.map(d => d.time), lineStyle: { color: '#7c5cfc', width: 2 }, itemStyle: { color: '#7c5cfc' }, symbol: 'none', areaStyle: { opacity: .1, color: '#7c5cfc' } },
    ],
  }), [data])
  return <ReactECharts option={option} style={STYLE} notMerge />
}

/* ── Station Ranking Chart (horizontal bar) ── */
export function StationRankChart({ data = [] }) {
  const top8 = data.slice(0, 8)
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(7,20,40,.95)',
      borderColor: 'rgba(79,142,247,.3)',
      textStyle: { color: '#e8f0ff', fontSize: 12 },
      axisPointer: { type: 'none' },
      formatter: p => `${p[0].name}: <b>${p[0].value?.toLocaleString()}</b> 人次`,
    },
    grid: { left: 68, right: 40, top: 8, bottom: 8 },
    xAxis: { type: 'value', axisLabel: { ...axisLabel, fontSize: 9, formatter: v => (v / 10000).toFixed(0) + 'w' }, splitLine },
    yAxis: { type: 'category', data: top8.map(d => d.name), axisLabel: { color: '#a8c4e8', fontSize: 10 }, axisTick: { show: false }, axisLine: { show: false } },
    series: [{
      type: 'bar', barWidth: 10,
      data: top8.map((d, i) => ({
        value: d.flow,
        itemStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: i < 3 ? '#ff4d6a' : i < 5 ? '#ffaa2c' : '#4f8ef7' }, { offset: 1, color: 'rgba(79,142,247,.2)' }] },
          borderRadius: [0, 3, 3, 0],
        },
      })),
      label: { show: true, position: 'right', color: '#7a9cc4', fontSize: 9, formatter: p => (p.value / 10000).toFixed(1) + 'w' },
    }],
  }), [top8])
  return <ReactECharts option={option} style={STYLE} notMerge />
}

/* ── Gauge: current load rate ── */
export function LoadGauge({ value = 0 }) {
  const color = value >= 110 ? '#ff4d6a' : value >= 90 ? '#ffaa2c' : value >= 70 ? '#4f8ef7' : '#00e5a0'
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 200, endAngle: -20, min: 0, max: 150,
      splitNumber: 5, radius: '88%', center: ['50%', '62%'],
      axisLine: {
        lineStyle: { width: 12, color: [[0.47, '#00e5a0'], [0.6, '#4f8ef7'], [0.73, '#ffaa2c'], [1, '#ff4d6a']] }
      },
      pointer: { length: '65%', width: 4, itemStyle: { color } },
      axisTick: { show: false },
      splitLine: { length: 8, lineStyle: { color: 'rgba(79,142,247,.3)', width: 1 } },
      axisLabel: { color: '#7a9cc4', fontSize: 9, distance: -20 },
      detail: {
        valueAnimation: true, fontSize: 22, fontWeight: 700, color,
        formatter: '{value}%', offsetCenter: [0, '20%'],
      },
      title: { show: true, offsetCenter: [0, '42%'], color: '#7a9cc4', fontSize: 10 },
      data: [{ value, name: '当前满载率' }],
    }],
  }), [value, color])
  return <ReactECharts option={option} style={STYLE} notMerge />
}
