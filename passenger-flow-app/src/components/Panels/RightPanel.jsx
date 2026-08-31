import { useState } from 'react'
import { FlowTrendChart, LoadRateChart, PredictionChart, ImbalanceChart, StationRankChart, LoadGauge } from '../Charts/Charts'
import { ALERTS } from '../../data/mockData'

const ALERT_ICONS = { danger: '🔴', warning: '🟡', info: '🔵' }

function PanelBlock({ title, height, children }) {
  return (
    <div className="glass-card" style={{ marginBottom: 8, padding: '10px 12px', height, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div className="section-title">{title}</div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  )
}

export default function RightPanel({ flowData, loadData, predData, imbalanceData, rankData, selectedStation, realtimeData }) {
  const [activeTab, setActiveTab] = useState('flow') // flow | predict | imbalance | rank
  const stationInfo = realtimeData.find(d => d.id === selectedStation)

  return (
    <div style={{
      width: 280, height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-panel)', borderLeft: '1px solid var(--border)',
      padding: '10px 10px', gap: 0, flexShrink: 0, overflow: 'hidden',
    }}>

      {/* Tab switcher */}
      <div className="tab-group" style={{ marginBottom: 8, flexShrink: 0 }}>
        {[['flow','客流'], ['predict','预测'], ['imbalance','不均衡'], ['rank','排名']].map(([v, l]) => (
          <button key={v} className={`tab-btn${activeTab===v?' active':''}`} onClick={() => setActiveTab(v)}>{l}</button>
        ))}
      </div>

      {/* ── 客流分析 tab ── */}
      {activeTab === 'flow' && (
        <>
          {/* Gauge */}
          <div className="glass-card" style={{ marginBottom: 8, padding: '8px 12px', height: 150, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div className="section-title">实时满载率</div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <LoadGauge value={stationInfo?.loadRate ?? 78} />
            </div>
          </div>

          {/* Entry / Exit trend */}
          <PanelBlock title="进出站客流趋势" height={200}>
            <FlowTrendChart data={flowData} />
          </PanelBlock>

          {/* Load rate */}
          <PanelBlock title="断面满载率" height={180}>
            <LoadRateChart data={loadData} />
          </PanelBlock>

          {/* Alerts */}
          <div className="glass-card" style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="section-title">实时告警</div>
            <div className="scroll-area">
              {ALERTS.map(a => (
                <div key={a.id} style={{ marginBottom: 8, padding: '7px 8px', background: 'rgba(255,255,255,.03)', borderRadius: 5, borderLeft: `2px solid ${a.level==='danger'?'var(--red)':a.level==='warning'?'var(--orange)':'var(--accent)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span className={`alert-badge ${a.level}`}>{ALERT_ICONS[a.level]} {a.level === 'danger' ? '超载' : a.level === 'warning' ? '预警' : '提示'}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.time}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--accent)', marginBottom: 2 }}>{a.station}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.msg}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── 预测 tab ── */}
      {activeTab === 'predict' && (
        <>
          {/* Prediction metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8, flexShrink: 0 }}>
            {[
              { label: '预测精度', val: '93.8%', color: 'var(--green)' },
              { label: '平均误差', val: '±420人', color: 'var(--accent)' },
              { label: '明日峰值', val: '8,920', color: 'var(--orange)' },
              { label: '峰值时段', val: '08:00', color: 'var(--cyan)' },
            ].map(m => (
              <div key={m.label} className="glass-card" style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 3, letterSpacing: .6 }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: m.color, textShadow: `0 0 10px ${m.color}` }}>{m.val}</div>
              </div>
            ))}
          </div>

          <PanelBlock title="7日客流预测（预测 vs 实际）" height={220}>
            <PredictionChart data={predData} />
          </PanelBlock>

          {/* Hourly prediction */}
          <PanelBlock title="明日分时预测" height={190}>
            <FlowTrendChart data={flowData.map(d => ({ ...d, exit: d.predict }))} />
          </PanelBlock>

          {/* Model info */}
          <div className="glass-card" style={{ padding: '10px 12px', flexShrink: 0, marginTop: 'auto' }}>
            <div className="section-title">模型信息</div>
            {[
              ['算法', 'LSTM 长短期记忆网络'],
              ['训练集', '2024.01 ~ 2025.06'],
              ['特征数', '24 个时序特征'],
              ['更新周期', '每日凌晨 02:00'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--text-secondary)', textAlign: 'right', maxWidth: 140 }}>{v}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 不均衡系数 tab ── */}
      {activeTab === 'imbalance' && (
        <>
          {/* Current coefficients */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginBottom: 8, flexShrink: 0 }}>
            {imbalanceData.length > 0 && (() => {
              const last = imbalanceData[imbalanceData.length - 1]
              return [
                { label: '方向不均衡系数', val: last.direction.toFixed(3), desc: '下行/上行客流比', color: 'var(--accent)', warn: last.direction > 1.3 },
                { label: '断面不均衡系数', val: last.section.toFixed(3), desc: '最大/平均断面比', color: 'var(--orange)', warn: last.section > 1.6 },
                { label: '时间不均衡系数', val: last.time.toFixed(3), desc: '高峰/平均小时比', color: 'var(--accent2)', warn: last.time > 2.0 },
              ].map(m => (
                <div key={m.label} className="glass-card" style={{ padding: '9px 12px', borderLeft: `2px solid ${m.warn ? 'var(--orange)' : m.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.desc}</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: m.warn ? 'var(--orange)' : m.color, textShadow: `0 0 10px ${m.color}` }}>{m.val}</div>
                  </div>
                  {m.warn && <div style={{ fontSize: 10, color: 'var(--orange)', marginTop: 4 }}>⚠ 超出均衡阈值</div>}
                </div>
              ))
            })()}
          </div>

          <PanelBlock title="7日不均衡系数趋势" height={220}>
            <ImbalanceChart data={imbalanceData} />
          </PanelBlock>

          {/* Interpretation */}
          <div className="glass-card" style={{ padding: '10px 12px', flex: 1, minHeight: 0 }}>
            <div className="section-title">参考标准</div>
            {[
              { name: '方向不均衡', good: '≤ 1.3', warn: '1.3~1.5', bad: '> 1.5' },
              { name: '断面不均衡', good: '≤ 1.6', warn: '1.6~2.0', bad: '> 2.0' },
              { name: '时间不均衡', good: '≤ 2.0', warn: '2.0~2.5', bad: '> 2.5' },
            ].map(r => (
              <div key={r.name} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>{r.name}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span className="alert-badge normal">{r.good} 正常</span>
                  <span className="alert-badge warning">{r.warn}</span>
                  <span className="alert-badge danger">{r.bad}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 排名 tab ── */}
      {activeTab === 'rank' && (
        <>
          <PanelBlock title="站点日客流 Top 8" height={240}>
            <StationRankChart data={rankData} />
          </PanelBlock>

          {/* Station status table */}
          <div className="glass-card" style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="section-title">全线站点实时状态</div>
            <div className="scroll-area">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['站点', '客流', '满载率', '状态'].map(h => (
                      <th key={h} style={{ padding: '4px 4px', color: 'var(--text-muted)', fontWeight: 500, textAlign: h === '站点' ? 'left' : 'center', fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {realtimeData.map(s => {
                    const color = s.loadRate >= 110 ? 'var(--red)' : s.loadRate >= 90 ? 'var(--orange)' : s.loadRate >= 70 ? 'var(--accent)' : 'var(--green)'
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(79,142,247,.05)', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '5px 4px', color: 'var(--text-secondary)' }}>{s.name}</td>
                        <td style={{ padding: '5px 4px', textAlign: 'center', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{s.currentFlow.toLocaleString()}</td>
                        <td style={{ padding: '5px 4px', textAlign: 'center', color, fontWeight: 600 }}>{s.loadRate}%</td>
                        <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                          <span className={`alert-badge ${s.alert}`}>{s.alert === 'danger' ? '超载' : s.alert === 'warning' ? '预警' : '正常'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
