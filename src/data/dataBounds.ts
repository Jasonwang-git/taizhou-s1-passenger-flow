/** 与 backend/data/parquet 全站点小时表对齐的可用日期范围 */
export const DATA_DATE_MIN = '2023-10-01'
export const DATA_DATE_MAX = '2024-06-30'

export const DEFAULT_DATE_RANGE = {
  start: DATA_DATE_MAX,
  end: DATA_DATE_MAX,
}

export const DEFAULT_TIME_RANGE = {
  start: '06:00',
  end: '22:00',
}

export function clampDateToDataRange(value: string): string {
  if (!value) return DATA_DATE_MAX
  if (value < DATA_DATE_MIN) return DATA_DATE_MIN
  if (value > DATA_DATE_MAX) return DATA_DATE_MAX
  return value
}

export function normalizeDateRange(range: { start: string; end: string }) {
  let start = clampDateToDataRange(range.start)
  let end = clampDateToDataRange(range.end)
  if (end < start) [start, end] = [end, start]
  return { start, end }
}
