import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export default function ToastHost() {
  const toast = useAppStore((s) => s.toast)
  const clearToast = useAppStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => clearToast(), 2800)
    return () => window.clearTimeout(timer)
  }, [toast, clearToast])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed bottom-8 left-1/2 z-[3000] -translate-x-1/2">
      <div className="pointer-events-auto flex max-w-[420px] items-start gap-2.5 rounded-xl border border-cyan-500/30 bg-slate-900/95 px-3.5 py-2.5 text-sm text-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur">
        <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" />
        <span className="flex-1 leading-snug">{toast.message}</span>
        <button
          className="flex-shrink-0 rounded p-0.5 text-slate-500 transition hover:text-slate-200"
          onClick={clearToast}
          aria-label="关闭"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
