import type { ReactNode } from 'react'

interface HudPanelProps {
  children: ReactNode
  className?: string
  title?: string
  titleEn?: string
  extra?: ReactNode
}

/** 数字孪生风格半透明 HUD 面板（四角 bracket + 双语标题） */
export default function HudPanel({
  children,
  className = '',
  title,
  titleEn,
  extra,
}: HudPanelProps) {
  return (
    <div className={`hud-panel hud-corners ${className}`}>
      {(title || extra) && (
        <div className="hud-title-bar px-0.5">
          <div>
            {title ? <h2 className="panel-title !mb-0">{title}</h2> : null}
            {titleEn ? <div className="panel-title-en">{titleEn}</div> : null}
          </div>
          {extra}
        </div>
      )}
      {children}
    </div>
  )
}
