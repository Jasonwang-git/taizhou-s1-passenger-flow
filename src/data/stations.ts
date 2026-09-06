import type { DataChannel, LineSegment, Station, ViewMode } from '@/types'

/**
 * 台州市域铁路 S1 线一期 15 站（北→南）
 * 坐标已转为 GCJ-02，可直接叠高德地图
 */
export const STATIONS: Station[] = [
  { id: '1', name: '台州火车站', lat: 28.6529299, lng: 121.3733934, order: 1 },
  { id: '2', name: '学院路站', lat: 28.6379766, lng: 121.4028272, order: 2 },
  { id: '3', name: '国博中心站', lat: 28.6211766, lng: 121.3995838, order: 3 },
  { id: '4', name: '汇丰路站', lat: 28.6104137, lng: 121.3887108, order: 4 },
  { id: '5', name: '锦泰站', lat: 28.5984434, lng: 121.3686753, order: 5 },
  { id: '6', name: '恩泽医院站', lat: 28.5869865, lng: 121.337139, order: 6 },
  { id: '7', name: '台州汽车南站', lat: 28.5690485, lng: 121.328998, order: 7 },
  { id: '8', name: '泽国站', lat: 28.4962431, lng: 121.3377386, order: 8 },
  { id: '9', name: '温岭火车站', lat: 28.4788461, lng: 121.3266722, order: 9 },
  { id: '10', name: '汇川王站', lat: 28.4398979, lng: 121.332377, order: 10 },
  { id: '11', name: '温岭第一人民医院站', lat: 28.4041231, lng: 121.343555, order: 11 },
  { id: '12', name: '九龙大道站', lat: 28.3935373, lng: 121.3598, order: 12 },
  { id: '13', name: '万昌路站', lat: 28.3775584, lng: 121.3764759, order: 13 },
  { id: '14', name: '南屏站', lat: 28.3638932, lng: 121.3863254, order: 14 },
  { id: '15', name: '城南站', lat: 28.3148384, lng: 121.4150792, order: 15 },
]

/** 相邻站构成的断面线段（北→南） */
export const LINE_SEGMENTS: LineSegment[] = STATIONS.slice(0, -1).map((from, i) => {
  const to = STATIONS[i + 1]
  return {
    id: `${from.id}-${to.id}`,
    fromId: from.id,
    toId: to.id,
    fromName: from.name,
    toName: to.name,
    label: `${from.name} → ${to.name}`,
  }
})

/** 票种：全部 / ACC / 互联网 */
export const DATA_CHANNELS: { value: DataChannel; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'acc', label: 'ACC' },
  { value: 'internet', label: '互联网' },
]

export const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
]

export const PREDICT_METHODS = [
  { value: 'lstm', label: 'LSTM 时序模型' },
  { value: 'arima', label: 'ARIMA' },
  { value: 'prophet', label: 'Prophet' },
  { value: 'xgboost', label: 'XGBoost' },
  { value: 'history', label: '历史同期均值' },
] as const

export const DAY_TYPES = [
  { value: 'all', label: '全部日期' },
  { value: 'workday', label: '工作日' },
  { value: 'weekend', label: '周末' },
  { value: 'holiday', label: '节假日' },
] as const

export const PREDICT_SCOPES = [
  { value: 'line', label: '全线' },
  { value: 'station', label: '单站' },
  { value: 'section', label: '断面' },
] as const

export const PREDICT_GRANULARITIES = [
  { value: 'hour', label: '小时' },
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
] as const

export const WEATHER_FACTORS = [
  { value: 'none', label: '不考虑' },
  { value: 'sunny', label: '晴天' },
  { value: 'rain', label: '雨天' },
  { value: 'wind', label: '大风' },
  { value: 'hot', label: '高温' },
  { value: 'cold', label: '低温' },
] as const

export const EVENT_FACTORS = [
  { value: 'none', label: '无特殊事件' },
  { value: 'holiday', label: '节假日' },
  { value: 'concert', label: '大型演出' },
  { value: 'sports', label: '体育赛事' },
  { value: 'school', label: '开学/放假' },
] as const

export const COMPARE_PERIODS = [
  { value: 'yesterday', label: '较昨日' },
  { value: 'lastWeek', label: '较上周同期' },
] as const

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  overview: '综合态势',
  'line-flow': '线路客流',
  'section-flow': '断面满载率',
  'station-flow': '站点客流',
  'peak-platform': '高峰站台',
  imbalance: '不均衡分析',
  prediction: '客流预测',
  'acc-data': '数据中心',
}

export const VIEW_MODE_DESC: Record<ViewMode, string> = {
  overview: '全线运行总览与关键指标',
  'line-flow': '分时进出站量与日趋势',
  'section-flow': '区间断面满载与警戒',
  'station-flow': '单站进出站与排名',
  'peak-platform': '早晚高峰站台拥挤',
  imbalance: '方向/断面/时段不均衡',
  prediction: '短时客流预测与建议',
  'acc-data': '数据接入与统计底座',
}

export const LINE_INFO = {
  name: '台州轨道交通 S1 线',
  length: '52.4 km',
  stations: 15,
  hours: '6:20–21:40',
}

/** 生成线路 GeoJSON — 后续可通过导入接口替换 */
export function buildLineGeoJSON(stations: Station[] = STATIONS) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: { name: 'S1线', color: '#1E90FF' },
        geometry: {
          type: 'LineString' as const,
          coordinates: stations.map((s) => [s.lng, s.lat]),
        },
      },
      ...stations.map((s) => ({
        type: 'Feature' as const,
        properties: { id: s.id, name: s.name, order: s.order },
        geometry: {
          type: 'Point' as const,
          coordinates: [s.lng, s.lat],
        },
      })),
    ],
  }
}
