import { KPI, ALERTS } from '../../data/mockData'

const METRICS = [
  { key: 'totalFlow',    label: '今日总客流', unit: '人次', color: 'var(--accent)',  format: v => (v / 10000).toFixed(1) + '万' },
  { key: 'peakFlow',     label: '高峰小时流量', unit: '人/h',  color: 'var(--cyan)',   format: v => v.toLocaleString() },
  { key: 'avgLoadRate',  label: '平均满载率', unit: '%',     color: 'var(--green)',  format: v => v },
  { key: 'alertCount',   label: '当前告警',   unit: '条',    color: 'var(--red)',    format: v => v },
  { key: 'onTimeRate',   label: '正点率',     unit: '%',     color: 'var(--orange)', format: v => v },
  { key: 'predAccuracy', label: '预测精度',   unit: '%',     color: 'var(--accent2)', format: v => v },
]

export default function Header({ currentTime }) {
  return (
    <div style={{
      height: 58, flexShrink: 0,
      background: 'linear-gradient(180deg, rgba(7,20,40,.98), rgba(4,13,31,.95))',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 0, position: 'relative', overflow: 'hidden',
    }}>

      {/* Background glow */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 400, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent), var(--accent2), transparent)', opacity: .6 }} />

      {/* Logo & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginRight: 24 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: 'var(--glow-blue)' }}>
          🚇
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: .5, lineHeight: 1.2 }}>台州 S1 线客流管理系统</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>TAIZHOU METRO · PASSENGER FLOW INTELLIGENCE</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: 'var(--border)', marginRight: 20, flexShrink: 0 }} />

      {/* KPI Metrics */}
      <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden' }}>
        {METRICS.map((m, i) => (
          <div key={m.key} style={{
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '0 16px', borderRight: i < METRICS.length - 1 ? '1px solid var(--border)' : 'none',
            minWidth: 0, flex: 1,
          }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: .8, whiteSpace: 'nowrap', marginBottom: 2 }}>{m.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: m.color, textShadow: `0 0 10px ${m.color}`, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                {m.format(KPI[m.key])}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{m.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: 'var(--border)', margin: '0 20px', flexShrink: 0 }} />

      {/* Alert count + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: 'rgba(0,229,160,.08)', border: '1px solid rgba(0,229,160,.2)', borderRadius: 12 }}>
          <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600, letterSpacing: .5 }}>LIVE</span>
        </div>

        {/* Alert badge */}
        {ALERTS.filter(a => a.level === 'danger').length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: 'rgba(255,77,106,.1)', border: '1px solid rgba(255,77,106,.25)', borderRadius: 12 }}>
            <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', animationDelay: '.3s' }} />
            <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>{ALERTS.filter(a=>a.level==='danger').length} 严重告警</span>
          </div>
        )}

        {/* Clock */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', letterSpacing: 1, lineHeight: 1.1 }}>{currentTime.time}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{currentTime.date}</div>
        </div>
      </div>
    </div>
  )
}
