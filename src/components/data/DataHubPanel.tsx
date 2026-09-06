import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, Database, HardDrive, Layers, RefreshCw } from 'lucide-react'
import { fetchDataHub, type DataHubPayload } from '@/api/accData'

function StatusDot({ status }: { status: 'ok' | 'warn' | 'missing' }) {
  const color =
    status === 'ok' ? 'text-emerald-400' : status === 'warn' ? 'text-amber-400' : 'text-slate-500'
  const Icon = status === 'ok' ? CheckCircle2 : CircleAlert
  return <Icon size={14} className={color} />
}

function fmtNum(n: number) {
  return n.toLocaleString('zh-CN')
}

export default function DataHubPanel() {
  const [hub, setHub] = useState<(DataHubPayload & { fromCache?: boolean }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDataHub()
      setHub(data)
    } catch (e) {
      setHub(null)
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const s = hub?.summary

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-200">
            数据接入 + 统计底座
            {hub?.fromCache && (
              <span className="rounded-sm border border-slate-600/60 px-1.5 py-0.5 text-[9px] font-normal text-slate-400">
                本地快照
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
            原始 Excel 接入状态 · ETL Parquet 底座（不在此展示交易明细）
          </p>
        </div>
        <button
          type="button"
          className="chip-btn inline-flex items-center gap-1 !px-2 !py-1"
          onClick={() => void reload()}
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-200">
          {error}
          <div className="mt-1 text-amber-200/70">
            在 backend 目录执行：uvicorn app.main:app --port 8000
          </div>
        </div>
      )}

      {hub?.fromCache && !error && (
        <div className="rounded-md border border-slate-600/40 bg-slate-950/40 px-2.5 py-1.5 text-[10px] text-slate-500">
          当前为本地快照（后端未连接）。启动 API 后点刷新可拿到实时状态。
        </div>
      )}

      {hub && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: '统计区间',
                value: s?.dateMin && s?.dateMax ? `${s.dateMin.slice(5)}~${s.dateMax.slice(5)}` : '—',
              },
              { label: '站点小时行', value: fmtNum(s?.stationHours ?? 0) },
              { label: 'OD 小时行', value: fmtNum(s?.odHours ?? 0) },
              { label: '模型产物', value: String(s?.modelCount ?? 0) },
            ].map((x) => (
              <div
                key={x.label}
                className="rounded-md border border-cyan-500/15 bg-slate-950/40 px-2.5 py-2"
              >
                <div className="text-[10px] text-slate-500">{x.label}</div>
                <div className="font-mono text-sm font-semibold text-slate-200">{x.value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="section-label">接入流水线</div>
            <div className="mt-1.5 space-y-1.5">
              {hub.pipeline.map((p) => (
                <div
                  key={p.step}
                  className="flex items-start gap-2 rounded-md border border-slate-700/50 bg-slate-950/35 px-2.5 py-2"
                >
                  <StatusDot status={p.status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-200">
                      <span className="font-mono text-[10px] text-cyan-500/80">{p.step}</span>
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-500">{p.desc}</div>
                    <div className="mt-0.5 truncate font-mono text-[9px] text-slate-600">{p.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-label inline-flex items-center gap-1">
              <HardDrive size={11} /> 原始文件（数据/）
            </div>
            <div className="mt-1.5 space-y-1">
              {hub.rawFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded border border-slate-800/80 px-2 py-1.5 text-[10px]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-slate-300">{f.label}</div>
                    <div className="truncate font-mono text-[9px] text-slate-600">{f.name}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className={f.exists ? 'text-emerald-400' : 'text-red-400'}>
                      {f.exists ? '已接入' : '缺失'}
                    </div>
                    <div className="font-mono text-slate-600">{f.sizeMb} MB</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-label inline-flex items-center gap-1">
              <Layers size={11} /> 统计底座（Parquet）
            </div>
            <div className="mt-1.5 space-y-1">
              {[hub.etl.hourlyStation, hub.etl.hourlyOd, hub.etl.hourlySection].map((t) => (
                <div
                  key={t.file}
                  className="flex items-center justify-between gap-2 rounded border border-slate-800/80 px-2 py-1.5 text-[10px]"
                >
                  <div className="min-w-0">
                    <div className="text-slate-300">{t.label}</div>
                    <div className="font-mono text-[9px] text-slate-600">{t.file}</div>
                  </div>
                  <div className="flex-shrink-0 text-right text-slate-400">
                    <div>{t.exists ? fmtNum(t.rows) : '未生成'}</div>
                    <div className="font-mono text-[9px] text-slate-600">
                      {t.min && t.max ? `${t.min} ~ ${t.max}` : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-cyan-500/15 bg-cyan-500/5 px-2.5 py-2 text-[10px] leading-relaxed text-slate-400">
            <div className="mb-1 flex items-center gap-1 text-cyan-300/90">
              <Database size={12} /> 用途说明
            </div>
            <ul className="space-y-0.5">
              {hub.usage.map((u) => (
                <li key={u}>· {u}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
