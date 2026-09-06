import type { AccRecord } from '@/types'

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ||
  'http://127.0.0.1:8000'

export interface AccTripsPayload {
  total: number
  records: AccRecord[]
  source?: string[]
  note?: string
  accCount?: number
  internetCount?: number
}

export interface DataHubPayload {
  role: string
  summary: {
    rawReady: boolean
    etlReady: boolean
    odReady: boolean
    modelsReady: boolean
    previewReady: boolean
    stationHours: number
    odHours: number
    sectionHours: number
    dateMin: string | null
    dateMax: string | null
    previewCount: number
    modelCount: number
  }
  rawFiles: Array<{
    id: string
    label: string
    name: string
    path: string
    exists: boolean
    sizeMb: number
  }>
  etl: {
    hourlyStation: { exists: boolean; rows: number; min?: string | null; max?: string | null; label: string; file: string }
    hourlyOd: { exists: boolean; rows: number; min?: string | null; max?: string | null; label: string; file: string }
    hourlySection: { exists: boolean; rows: number; min?: string | null; max?: string | null; label: string; file: string }
    parquetDir: string
    rawDir: string
  }
  preview: {
    exists: boolean
    count: number
    accCount?: number
    internetCount?: number
    note?: string
    source?: string[]
  }
  models: {
    methods: Record<string, boolean>
    artifacts: string[]
    metricsCount: number
    artifactsDir: string
  }
  pipeline: Array<{
    step: number
    name: string
    desc: string
    status: 'ok' | 'warn' | 'missing'
    detail: string
  }>
  usage: string[]
}

function normalizeRecord(raw: Record<string, unknown>, index: number): AccRecord {
  const ticketRaw = String(raw.ticketName ?? raw.ticketRaw ?? 'ACC')
  const ticketName = /互联|网|internet|qr|码/i.test(ticketRaw) ? '互联网' : 'ACC'
  return {
    id: Number(raw.id) || index + 1,
    operationDate: String(raw.operationDate ?? '').slice(0, 10),
    entryTime: String(raw.entryTime ?? ''),
    entryStation: String(raw.entryStation ?? ''),
    exitTime: String(raw.exitTime ?? ''),
    exitStation: String(raw.exitStation ?? ''),
    cardNumber: String(raw.cardNumber ?? `R${index + 1}`),
    ticketName,
    amount: String(raw.amount ?? '0'),
  }
}

export async function fetchDataHub(): Promise<DataHubPayload & { fromCache?: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/api/data-hub`)
    if (res.ok) {
      return (await res.json()) as DataHubPayload
    }
  } catch {
    /* fall through to local snapshot */
  }

  const local = await fetch('/data/data-hub.json')
  if (!local.ok) {
    throw new Error('无法获取数据中心状态：后端未启动，且本地快照也不存在')
  }
  const data = (await local.json()) as DataHubPayload
  return { ...data, fromCache: true }
}

/** 优先后端 API，失败则读 public/data/acc-trips.json */
export async function fetchAccRecords(limit = 5000): Promise<AccTripsPayload> {
  try {
    const res = await fetch(`${API_BASE}/api/acc-records?limit=${limit}`)
    if (res.ok) {
      const data = (await res.json()) as {
        total?: number
        records?: Record<string, unknown>[]
        source?: string[]
        note?: string
        accCount?: number
        internetCount?: number
      }
      const records = (data.records || []).map((r, i) => normalizeRecord(r, i))
      return {
        total: data.total ?? records.length,
        records,
        source: data.source,
        note: data.note,
        accCount: data.accCount,
        internetCount: data.internetCount,
      }
    }
  } catch {
    /* fall through */
  }

  const local = await fetch('/data/acc-trips.json')
  if (!local.ok) {
    throw new Error('无法加载真实交易数据，请确认 public/data/acc-trips.json 或后端服务')
  }
  const data = (await local.json()) as {
    count?: number
    records?: Record<string, unknown>[]
    source?: string[]
    note?: string
    accCount?: number
    internetCount?: number
  }
  const records = (data.records || []).slice(0, limit).map((r, i) => normalizeRecord(r, i))
  return {
    total: data.count ?? records.length,
    records,
    source: data.source,
    note: data.note,
    accCount: data.accCount,
    internetCount: data.internetCount,
  }
}
