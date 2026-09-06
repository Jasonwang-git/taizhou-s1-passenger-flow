import type { AccRecord, AlertItem, MetricItem, PredictMethod } from '@/types'
import { STATIONS } from '@/data/stations'
import { getChannelShare } from '@/data/analysisEngine'

export {
  getFactorImpact,
  genLineFlowData,
  genDayTypeCompareData,
  genSectionRates,
  identifyMaxSection,
  getChannelShare,
  getStationRankData,
  getHeatmapData,
  genPeakHourCompare,
  genOdMatrix,
  genCompareTrend,
  genPredictionData,
  genPeakSuggestions,
  getOverviewMetrics,
} from '@/data/analysisEngine'

const MOCK_TICKET_NAMES = ['ACC', '互联网']

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function genAccData(count = 50): AccRecord[] {
  const rows: AccRecord[] = []
  const dates = ['2025-07-10', '2025-07-11', '2025-07-12']
  const times = [
    '07:23:41', '08:15:20', '09:02:55', '10:45:30', '12:30:10',
    '14:20:00', '16:55:42', '17:38:25', '18:50:00', '19:20:15',
  ]

  for (let i = 0; i < count; i++) {
    const d = dates[i % 3]
    const t1 = times[i % 10]
    const eIdx = randInt(0, STATIONS.length - 1)
    const xIdx = (eIdx + randInt(2, 6)) % STATIONS.length
    const ticketName = MOCK_TICKET_NAMES[i % MOCK_TICKET_NAMES.length]

    rows.push({
      id: 1000 + i,
      operationDate: d,
      entryTime: `${d} ${t1}`,
      entryStation: STATIONS[eIdx].name,
      exitTime: `${d} ${times[(i + 2) % 10]}`,
      exitStation: STATIONS[xIdx].name,
      cardNumber: `622${randInt(10000000, 99999999)}`,
      ticketName,
      amount: (randInt(2, 12) / 2).toFixed(1),
    })
  }
  return rows
}

/** @deprecated 使用 identifyMaxSection(filter) */
export const MAX_SECTION = {
  from: '温岭火车站',
  to: '汇川王站',
  direction: '下行' as const,
  flow: 12840,
  loadRate: 125,
  peakTime: '17:30',
}

export const CHANNEL_SHARE = getChannelShare({
  dateRange: { start: '2025-07-12', end: '2025-07-12' },
  dataChannel: '',
  stationId: '',
  direction: 'down',
  timeRange: { start: '06:00', end: '22:00' },
  predictMethod: 'lstm',
  dayType: 'all',
  predictScope: 'line',
  predictGranularity: 'day',
  weatherFactor: 'none',
  eventFactor: 'none',
  comparePeriod: 'yesterday',
  enableCorrection: true,
})

export const TICKET_SHARE = CHANNEL_SHARE

export const OD_TOP = [
  { from: '台州火车站', to: '温岭火车站', flow: 6240 },
  { from: '城南站', to: '温岭火车站', flow: 5180 },
  { from: '恩泽医院站', to: '台州火车站', flow: 3920 },
  { from: '泽国站', to: '温岭火车站', flow: 3560 },
  { from: '国博中心站', to: '学院路站', flow: 2840 },
]

export const YOY_MOM_METRICS = [
  { label: '今日客流', value: '12.8万', mom: 3.2, yoy: 8.6 },
  { label: '进站量', value: '6.52万', mom: 2.4, yoy: 7.1 },
  { label: '出站量', value: '6.31万', mom: 1.9, yoy: 6.8 },
  { label: '峰值满载', value: '125%', mom: 4.1, yoy: -1.2 },
]

export const MODEL_COMPARE: { method: PredictMethod; label: string; mape: number; rmse: string; score: number }[] = [
  { method: 'lstm', label: 'LSTM', mape: 4.2, rmse: '8.6k', score: 94.6 },
  { method: 'prophet', label: 'Prophet', mape: 5.1, rmse: '9.8k', score: 92.1 },
  { method: 'xgboost', label: 'XGBoost', mape: 4.8, rmse: '9.1k', score: 93.0 },
  { method: 'arima', label: 'ARIMA', mape: 6.4, rmse: '11.2k', score: 89.5 },
  { method: 'history', label: '历史同期', mape: 7.8, rmse: '13.5k', score: 86.2 },
]

export const PEAK_SUGGESTIONS = [
  { title: '加密行车间隔', detail: '17:00–18:30 下行温岭火车站—汇川王站建议间隔由 8 分压至 6 分', effect: '峰值满载预计降至 105%' },
  { title: '增开临客', detail: '晚高峰建议增开 2 列临客，覆盖泽国—城南区段', effect: '预计疏解约 1800 人次' },
  { title: '站台限流引导', detail: '温岭火车站、台州火车站启动分区进站引导', effect: '站台拥挤度下降约 12%' },
  { title: '乘客分流提示', detail: '通过 App/广播引导部分乘客错峰或改乘公交接驳', effect: '高峰进站峰值 -6%' },
]

export const CORRECTION_ALERT = {
  deviation: 8.4,
  message: '实时进站量较预测偏高 8.4%，已触发动态校正',
  time: '17:28',
}

export const HEADER_KPIS = [
  { label: '线路全长', value: '52.4', unit: 'km' },
  { label: '车站数', value: '15', unit: '座' },
  { label: '今日客流', value: '12.8', unit: '万' },
  { label: '满载告警', value: '3', unit: '处' },
]

export const OVERVIEW_METRICS: MetricItem[] = [
  { label: '今日总客流', value: '1,284,620', unit: '人次', trend: 3.2, color: 'cyan' },
  { label: '当前在途旅客', value: '68,430', unit: '人', trend: 1.8, color: 'green' },
  { label: '平均满载率', value: '92.4', unit: '%', trend: -0.6, color: 'orange' },
  { label: '超载预警', value: 14, unit: '次', trend: -2, color: 'red' },
]

export const ALERTS: AlertItem[] = [
  { id: '1', level: 'danger', message: '温岭火车站→汇川王站 断面满载率 125%，已超三级警戒', time: '17:32' },
  { id: '2', level: 'warning', message: '台州火车站 晚高峰站台拥挤度 85%', time: '17:28' },
  { id: '3', level: 'warning', message: '泽国站 进站量较昨日同期 +18%', time: '17:15' },
  { id: '4', level: 'info', message: '明日预测客流 132 万人次，建议增开 2 列临客', time: '16:50' },
  { id: '5', level: 'info', message: 'ACC / 互联网交易数据已同步，最新批次 2025-07-12', time: '16:30' },
]
