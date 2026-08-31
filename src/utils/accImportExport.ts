import type { AccRecord } from '@/types'

const ACC_HEADERS = ['运营日期', '进站时间', '进站', '出站时间', '出站', '卡号', '票种', '金额'] as const

export function downloadAccTemplate() {
  const sample = [
    ACC_HEADERS.join(','),
    '2025-07-12,2025-07-12 08:15:20,台州火车站,2025-07-12 08:55:10,温岭火车站,62210001,ACC,3.0',
    '2025-07-12,2025-07-12 17:20:00,温岭火车站,2025-07-12 18:05:00,城南站,62210002,互联网,4.5',
  ].join('\n')
  downloadText('客流数据导入模板.csv', '\uFEFF' + sample)
}

export function exportAccCsv(rows: AccRecord[], filename = 'acc-export.csv') {
  const lines = [
    ACC_HEADERS.join(','),
    ...rows.map((r) =>
      [
        r.operationDate,
        r.entryTime,
        r.entryStation,
        r.exitTime,
        r.exitStation,
        r.cardNumber,
        r.ticketName,
        r.amount,
      ].join(','),
    ),
  ]
  downloadText(filename, '\uFEFF' + lines.join('\n'))
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      cells.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  cells.push(cur.trim())
  return cells
}

/** 解析 CSV 文本为 AccRecord（表头可中英文） */
export function parseAccCsv(text: string): AccRecord[] {
  const raw = text.replace(/^\uFEFF/, '').trim()
  if (!raw) return []
  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const idx = (aliases: string[]) =>
    header.findIndex((h) => aliases.some((a) => h.includes(a.toLowerCase())))

  const iDate = idx(['运营日期', '日期', 'date', 'operation'])
  const iEntryTime = idx(['进站时间', 'entrytime', 'entry_time'])
  const iEntry = idx(['进站', 'entrystation', 'entry'])
  const iExitTime = idx(['出站时间', 'exittime', 'exit_time'])
  const iExit = idx(['出站', 'exitstation', 'exit'])
  const iCard = idx(['卡号', 'card'])
  const iTicket = idx(['票种', 'ticket', 'channel'])
  const iAmount = idx(['金额', 'amount'])

  if (iEntry < 0 || iExit < 0) {
    throw new Error('CSV 需至少包含「进站」「出站」列')
  }

  const rows: AccRecord[] = []
  let id = Date.now()
  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r])
    if (!cells.some((c) => c)) continue
    const ticketRaw = (iTicket >= 0 ? cells[iTicket] : 'ACC') || 'ACC'
    const ticketName = /互联|网|internet|qr|码/i.test(ticketRaw) ? '互联网' : 'ACC'
    const operationDate =
      (iDate >= 0 ? cells[iDate] : '') ||
      (iEntryTime >= 0 ? cells[iEntryTime]?.slice(0, 10) : '') ||
      new Date().toISOString().slice(0, 10)

    rows.push({
      id: id++,
      operationDate,
      entryTime: iEntryTime >= 0 ? cells[iEntryTime] || `${operationDate} 08:00:00` : `${operationDate} 08:00:00`,
      entryStation: cells[iEntry] || '',
      exitTime: iExitTime >= 0 ? cells[iExitTime] || `${operationDate} 09:00:00` : `${operationDate} 09:00:00`,
      exitStation: cells[iExit] || '',
      cardNumber: iCard >= 0 ? cells[iCard] || `IMP${id}` : `IMP${id}`,
      ticketName,
      amount: iAmount >= 0 ? cells[iAmount] || '0' : '0',
    })
  }
  return rows
}

export async function readAccFile(file: File): Promise<AccRecord[]> {
  const text = await file.text()
  return parseAccCsv(text)
}
