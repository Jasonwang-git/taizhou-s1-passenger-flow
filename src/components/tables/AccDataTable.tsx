import { useRef, useState } from 'react'
import { Download, FileSpreadsheet, FileUp, X } from 'lucide-react'
import { downloadAccTemplate, exportAccCsv, readAccFile } from '@/utils/accImportExport'
import { useAppStore } from '@/store/useAppStore'

const COLUMN_SPECS = [
  { name: '运营日期', required: false, example: '2025-07-12', desc: '运营日，YYYY-MM-DD；缺省时从进站时间截取' },
  { name: '进站时间', required: false, example: '2025-07-12 08:15:20', desc: '进站刷卡时间' },
  { name: '进站', required: true, example: '台州火车站', desc: '进站站点名称（必填）' },
  { name: '出站时间', required: false, example: '2025-07-12 08:55:10', desc: '出站刷卡时间' },
  { name: '出站', required: true, example: '温岭火车站', desc: '出站站点名称（必填）' },
  { name: '卡号', required: false, example: '62210001', desc: '卡号 / 票卡标识' },
  { name: '票种', required: false, example: 'ACC', desc: 'ACC 或 互联网（含网/码等字样会归为互联网）' },
  { name: '金额', required: false, example: '3.0', desc: '交易金额（元）' },
] as const

export default function AccDataTable() {
  const accData = useAppStore((s) => s.accData)
  const channel = useAppStore((s) => s.filter.dataChannel)
  const importAccRecords = useAppStore((s) => s.importAccRecords)
  const showToast = useAppStore((s) => s.showToast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  const rows = (() => {
    if (channel === 'acc') return accData.filter((r) => r.ticketName === 'ACC')
    if (channel === 'internet') return accData.filter((r) => r.ticketName === '互联网')
    return accData
  })()

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const parsed = await readAccFile(file)
      if (!parsed.length) {
        showToast('未解析到有效记录，请检查 CSV 格式')
        return
      }
      importAccRecords(parsed, true)
      setGuideOpen(false)
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
          onClick={() => setGuideOpen(true)}
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

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-[#061428]">
            <tr className="border-b border-slate-700 text-slate-500">
              <th className="px-2 py-1.5 text-left font-medium">日期</th>
              <th className="px-2 py-1.5 text-left font-medium">进站</th>
              <th className="px-2 py-1.5 text-left font-medium">出站</th>
              <th className="px-2 py-1.5 text-left font-medium">票种</th>
              <th className="px-2 py-1.5 text-right font-medium">金额</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((row) => (
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
          共 {rows.length} 条 · 显示前 {Math.min(100, rows.length)} 条
        </p>
      </div>

      {guideOpen && (
        <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#020814]/55 backdrop-blur-[2px]"
            aria-label="关闭"
            onClick={() => setGuideOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="acc-import-guide-title"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-lg border border-cyan-500/30 bg-[#061428]/95 shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
          >
            <header className="flex items-center justify-between border-b border-cyan-500/20 px-4 py-3">
              <div>
                <h3 id="acc-import-guide-title" className="text-sm font-semibold text-white">
                  导入 CSV 格式说明
                </h3>
                <p className="mt-0.5 text-[10px] tracking-wide text-cyan-400/60">
                  UTF-8 · 逗号分隔 · 首行为表头
                </p>
              </div>
              <button
                type="button"
                className="rounded-sm border border-slate-600/50 p-1 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-200"
                onClick={() => setGuideOpen(false)}
              >
                <X size={16} />
              </button>
            </header>

            <div className="max-h-[min(420px,55vh)] space-y-3 overflow-y-auto px-4 py-3 scrollbar-thin">
              <p className="text-[11px] leading-relaxed text-slate-400">
                请上传 <span className="text-cyan-300">.csv</span> 文件。表头支持中英文别名；至少包含「进站」「出站」两列。导入后会覆盖当前列表中的客流记录。
              </p>

              <div className="overflow-hidden rounded-sm border border-cyan-500/15">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-500">
                      <th className="px-2.5 py-1.5 text-left font-medium">列名</th>
                      <th className="px-2.5 py-1.5 text-left font-medium">说明</th>
                      <th className="px-2.5 py-1.5 text-left font-medium">示例</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COLUMN_SPECS.map((col) => (
                      <tr key={col.name} className="border-t border-slate-800/80">
                        <td className="px-2.5 py-1.5 whitespace-nowrap text-cyan-200">
                          {col.name}
                          {col.required && (
                            <span className="ml-1 text-amber-400/90">*</span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-400">{col.desc}</td>
                        <td className="px-2.5 py-1.5 font-mono text-slate-500">{col.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-sm border border-slate-700/50 bg-slate-950/40 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-slate-500">
                运营日期,进站时间,进站,出站时间,出站,卡号,票种,金额
                <br />
                2025-07-12,2025-07-12 08:15:20,台州火车站,2025-07-12 08:55:10,温岭火车站,62210001,ACC,3.0
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-cyan-500/15 px-4 py-3">
              <button
                type="button"
                className="chip-btn inline-flex items-center gap-1 !px-2.5 !py-1.5"
                onClick={() => downloadAccTemplate()}
              >
                <FileSpreadsheet size={12} /> 下载模板
              </button>
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-1 !px-3 !py-1.5 !text-xs"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp size={12} /> 选择文件上传
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
