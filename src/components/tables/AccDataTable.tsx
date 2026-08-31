import { useMemo, useRef } from 'react'
import { Download, FileUp, FileSpreadsheet } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { downloadAccTemplate, exportAccCsv, readAccFile } from '@/utils/accImportExport'

export default function AccDataTable() {
  const accData = useAppStore((s) => s.accData)
  const channel = useAppStore((s) => s.filter.dataChannel)
  const importAccRecords = useAppStore((s) => s.importAccRecords)
  const showToast = useAppStore((s) => s.showToast)
  const fileRef = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => {
    if (channel === 'acc') return accData.filter((r) => r.ticketName === 'ACC')
    if (channel === 'internet') return accData.filter((r) => r.ticketName === '互联网')
    return accData
  }, [accData, channel])

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const parsed = await readAccFile(file)
      if (!parsed.length) {
        showToast('未解析到有效记录，请检查 CSV 格式')
        return
      }
      importAccRecords(parsed, true)
      showToast(`已导入 ${parsed.length} 条客流记录`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '导入失败')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="chip-btn inline-flex items-center gap-1 !px-2 !py-1"
          onClick={() => downloadAccTemplate()}
        >
          <FileSpreadsheet size={12} /> 下载模板
        </button>
        <button
          type="button"
          className="chip-btn inline-flex items-center gap-1 !px-2 !py-1"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp size={12} /> 导入 CSV
        </button>
        <button
          type="button"
          className="chip-btn inline-flex items-center gap-1 !px-2 !py-1"
          onClick={() => exportAccCsv(rows, `acc-${channel || 'all'}.csv`)}
        >
          <Download size={12} /> 导出当前
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            void onImport(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-slate-700 text-slate-500">
              <th className="px-2 py-1.5 text-left font-medium">日期</th>
              <th className="px-2 py-1.5 text-left font-medium">进站</th>
              <th className="px-2 py-1.5 text-left font-medium">出站</th>
              <th className="px-2 py-1.5 text-left font-medium">票种</th>
              <th className="px-2 py-1.5 text-right font-medium">金额</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map((row) => (
              <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-2 py-1.5 text-slate-400">{row.operationDate}</td>
                <td className="px-2 py-1.5 text-slate-300">{row.entryStation}</td>
                <td className="px-2 py-1.5 text-slate-300">{row.exitStation}</td>
                <td className="px-2 py-1.5 text-slate-400">{row.ticketName}</td>
                <td className="px-2 py-1.5 text-right text-cyan-400">¥{row.amount}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-slate-600">
                  无匹配记录，可导入 CSV 或切换票种筛选
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-center text-[10px] text-slate-600">
          共 {rows.length} 条 · 显示前 {Math.min(12, rows.length)} 条
        </p>
      </div>
    </div>
  )
}
