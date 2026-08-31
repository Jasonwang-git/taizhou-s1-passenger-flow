// Mock station and flow data for Taizhou S1 Line
export const STATIONS = [
  { id: '1',  name: '台州站',    code: 'TZZ', order: 1 },
  { id: '2',  name: '天台路站',  code: 'TTL', order: 2 },
  { id: '3',  name: '市政府站',  code: 'SZF', order: 3 },
  { id: '4',  name: '文化路站',  code: 'WHL', order: 4 },
  { id: '5',  name: '商业中心站',code: 'SYZ', order: 5 },
  { id: '6',  name: '万达广场站',code: 'WDG', order: 6 },
  { id: '7',  name: '路桥北站',  code: 'LQB', order: 7 },
  { id: '8',  name: '路桥站',    code: 'LQZ', order: 8 },
  { id: '9',  name: '新桥站',    code: 'XQZ', order: 9 },
  { id: '10', name: '黄岩北站',  code: 'HYB', order: 10 },
  { id: '11', name: '黄岩站',    code: 'HYZ', order: 11 },
  { id: '12', name: '椒江站',    code: 'JJZ', order: 12 },
  { id: '13', name: '台州东站',  code: 'TZD', order: 13 },
  { id: '14', name: '客运中心站',code: 'KYZ', order: 14 },
]

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// Hourly flow data (24h)
export const HOURS = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`)

export function genHourlyFlow(stationId) {
  const peaks = { entry: [7, 8, 17, 18], exit: [8, 9, 18, 19] }
  return HOURS.map((_, i) => {
    const h = i + 6
    const isPeakEntry = peaks.entry.includes(h)
    const isPeakExit = peaks.exit.includes(h)
    return {
      hour: HOURS[i],
      entry: isPeakEntry ? rand(3500, 6800) : rand(400, 2200),
      exit:  isPeakExit  ? rand(3200, 6500) : rand(380, 2000),
      predict: isPeakEntry ? rand(3200, 7000) : rand(350, 2500),
    }
  })
}

// Section load rate
export function genSectionLoad() {
  return HOURS.map((h, i) => {
    const hour = i + 6
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
    return {
      hour: h,
      loadRate: isPeak ? rand(85, 130) : rand(25, 75),
    }
  })
}

// 7-day prediction
export function genWeekPrediction() {
  const days = ['07-12', '07-13', '07-14', '07-15', '07-16', '07-17', '07-18',
                '07-19', '07-20', '07-21']
  return days.map((d, i) => ({
    date: d,
    actual:  i < 7 ? rand(180000, 320000) : null,
    predict: rand(185000, 315000),
    upper:   rand(310000, 340000),
    lower:   rand(160000, 185000),
  }))
}

// Station ranking
export function genStationRanking() {
  return [...STATIONS]
    .map(s => ({ ...s, flow: rand(8000, 95000) }))
    .sort((a, b) => b.flow - a.flow)
}

// Real-time station status
export function genRealtimeStatus() {
  return STATIONS.map(s => ({
    ...s,
    currentFlow: rand(120, 2800),
    loadRate: rand(20, 125),
    trend: rand(-15, 15),
    alert: Math.random() > 0.85 ? (Math.random() > 0.5 ? 'warning' : 'danger') : 'normal',
  }))
}

// Imbalance coefficients
export function genImbalanceData() {
  const dates = ['07-12', '07-13', '07-14', '07-15', '07-16', '07-17', '07-18']
  return dates.map(d => ({
    date: d,
    direction: +(1.05 + Math.random() * 0.3).toFixed(3),
    section:   +(1.3  + Math.random() * 0.5).toFixed(3),
    time:      +(1.6  + Math.random() * 0.8).toFixed(3),
    downFlow:  rand(25000, 45000),
    upFlow:    rand(20000, 38000),
  }))
}

// Alerts
export const ALERTS = [
  { id: 1, level: 'danger',  time: '08:23', station: '商业中心站', msg: '进站满载率超过120%，建议加开备用车' },
  { id: 2, level: 'warning', time: '08:15', station: '路桥站',    msg: '断面客流预警，当前满载率 98%' },
  { id: 3, level: 'warning', time: '07:58', station: '万达广场站', msg: '早高峰进站量超历史同期 15%' },
  { id: 4, level: 'info',    time: '07:30', station: '全线',      msg: '早高峰客流预测：预计08:00达峰值 6800人/小时' },
  { id: 5, level: 'info',    time: '06:10', station: '系统',      msg: '预测模型已完成今日早高峰数据加载' },
]

// Top KPI metrics
export const KPI = {
  totalFlow:    284620,
  peakFlow:     9240,
  avgLoadRate:  78.3,
  alertCount:   3,
  onTimeRate:   97.2,
  predAccuracy: 93.8,
}
