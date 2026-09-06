export type ViewMode =
  | 'overview'
  | 'line-flow'
  | 'section-flow'
  | 'station-flow'
  | 'peak-platform'
  | 'imbalance'
  | 'prediction'
  | 'acc-data'

export interface Station {
  id: string
  name: string
  lat: number
  lng: number
  order: number
}

export interface TicketType {
  value: string
  label: string
}

export interface MetricItem {
  label: string
  value: string | number
  unit?: string
  trend?: number
  color: 'cyan' | 'green' | 'orange' | 'red'
}

export interface AlertItem {
  id: string
  level: 'info' | 'warning' | 'danger'
  message: string
  time: string
}

export interface AccRecord {
  id: number
  operationDate: string
  entryTime: string
  entryStation: string
  exitTime: string
  exitStation: string
  cardNumber: string
  ticketName: string
  amount: string
}

export interface DateRange {
  start: string
  end: string
}

export type PredictMethod = 'lstm' | 'arima' | 'prophet' | 'xgboost' | 'history'

/** 数据渠道 / 票种：全部 / ACC / 互联网 */
export type DataChannel = '' | 'acc' | 'internet'

export type DayType = 'all' | 'workday' | 'weekend' | 'holiday'

export type PredictScope = 'line' | 'station' | 'section'

export type PredictGranularity = 'hour' | 'day' | 'week' | 'month'

export type WeatherFactor = 'none' | 'sunny' | 'rain' | 'wind' | 'hot' | 'cold'

export type EventFactor = 'none' | 'holiday' | 'concert' | 'sports' | 'school'

export type ComparePeriod = 'yesterday' | 'lastWeek'

export interface TimeRange {
  start: string
  end: string
}

export interface LineSegment {
  id: string
  fromId: string
  toId: string
  fromName: string
  toName: string
  label: string
}

export interface FilterState {
  /** 分析日期（按天） */
  dateRange: DateRange
  /** 数据渠道 */
  dataChannel: DataChannel
  stationId: string
  direction: 'up' | 'down'
  /** 分析时段（一天内的起止时刻，与日期分开） */
  timeRange: TimeRange
  predictMethod: PredictMethod
  dayType: DayType
  predictScope: PredictScope
  /** 预测时间粒度：小时 / 日 / 周 / 月 */
  predictGranularity: PredictGranularity
  weatherFactor: WeatherFactor
  eventFactor: EventFactor
  comparePeriod: ComparePeriod
  /** 是否启用实时校正展示 */
  enableCorrection: boolean
}
