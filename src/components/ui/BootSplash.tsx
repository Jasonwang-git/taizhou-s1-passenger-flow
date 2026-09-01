import { Loader2 } from 'lucide-react'

interface BootSplashProps {
  visible: boolean
}

/** 全屏启动页：地图与界面就绪前遮罩 */
export default function BootSplash({ visible }: BootSplashProps) {
  return (
    <div
      className={`fixed inset-0 z-[5000] flex flex-col items-center justify-center bg-[#020814] transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!visible}
      aria-busy={visible}
    >
      <div className="mb-6 h-px w-40 bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      <p className="mb-1 text-[10px] tracking-[0.35em] text-cyan-400/50">
        TAIZHOU S1 PASSENGER FLOW
      </p>
      <h1 className="mb-8 text-base font-semibold tracking-[0.2em] text-slate-100">
        台州 S1 线客流预测系统
      </h1>
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-cyan-400" strokeWidth={2} />
      <p className="text-xs tracking-widest text-slate-400">系统加载中…</p>
      <div className="mt-6 h-px w-40 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
    </div>
  )
}
