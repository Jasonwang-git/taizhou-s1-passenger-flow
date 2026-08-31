import { useState } from 'react'
import { STATIONS } from '../../data/mockData'

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: .8 }}>{label}</div>
      {children}
    </div>
  )
}

export default function LeftPanel({ selectedStation, onStationChange, params, onParamsChange, onQuery }) {
  const [mode, setMode] = useState('station') // 'station' | 'section' | 'line'
  const [sectionA, setSectionA] = useState('')
  const [sectionB, setSectionB] = useState('')
  const [collapsed, setCollapsed] = useState(false)

  function handleMode(m) {
    setMode(m)
    onParamsChange?.({ ...params, mode: m })
  }

  return (
    <div style={{
      width: collapsed ? 36 : 220,
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border)',
      transition: 'width .25s ease',
      overflow: 'hidden', flexShrink: 0, position: 'relative',
    }}>

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(c => !c)} style={{
        position: 'absolute', right: collapsed ? '50%' : -1, top: '50%',
        transform: collapsed ? 'translate(50%,-50%)' : 'translate(50%,-50%)',
        zIndex: 10, background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 4, width: 16, height: 32,
        color: 'var(--accent)', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 10, padding: 0,
      }}>
        {collapsed ? '›' : '‹'}
      </button>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 12px 12px 12px', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ marginBottom: 14, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1.2, marginBottom: 2 }}>分析模式</div>
            <div className="tab-group">
              {[['station','站点'],['section','断面'],['line','全线']].map(([v, l]) => (
                <button key={v} className={`tab-btn${mode===v?' active':''}`} onClick={() => handleMode(v)}>{l}</button>
              ))}
            </div>
          </div>

          {/* Station selector */}
          {mode === 'station' && (
            <Row label="选择站点">
              <div className="scroll-area" style={{ maxHeight: 200, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 0' }}>
                {STATIONS.map(s => (
                  <div key={s.id}
                    className={`station-item${selectedStation === s.id ? ' selected' : ''}`}
                    onClick={() => onStationChange?.(s.id)}
                  >
                    <div className="station-dot" style={{
                      background: selectedStation === s.id ? 'var(--accent)' : 'var(--text-muted)',
                      boxShadow: selectedStation === s.id ? '0 0 6px var(--accent)' : 'none',
                    }}/>
                    <span style={{ fontSize: 12, color: selectedStation === s.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {s.name}
                    </span>
                  </div>
                ))}
              </div>
            </Row>
          )}

          {/* Section selector */}
          {mode === 'section' && (
            <>
              <Row label="起始站">
                <select className="dark-select" value={sectionA} onChange={e => setSectionA(e.target.value)}>
                  <option value="">请选择</option>
                  {STATIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Row>
              <Row label="终止站">
                <select className="dark-select" value={sectionB} onChange={e => setSectionB(e.target.value)}>
                  <option value="">请选择</option>
                  {STATIONS.filter(s => s.id !== sectionA).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Row>
              <Row label="方向">
                <div className="tab-group">
                  <button className={`tab-btn${params?.dir==='down'?' active':''}`} onClick={() => onParamsChange?.({...params,dir:'down'})}>下行</button>
                  <button className={`tab-btn${params?.dir==='up'?' active':''}`} onClick={() => onParamsChange?.({...params,dir:'up'})}>上行</button>
                </div>
              </Row>
            </>
          )}

          {/* Date range */}
          <Row label="日期范围">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <input type="date" className="dark-input" value={params?.startDate || '2025-07-12'}
                onChange={e => onParamsChange?.({ ...params, startDate: e.target.value })} />
              <input type="date" className="dark-input" value={params?.endDate || '2025-07-18'}
                onChange={e => onParamsChange?.({ ...params, endDate: e.target.value })} />
            </div>
          </Row>

          {/* Time range */}
          <Row label="时间段">
            <div className="tab-group">
              {[['all','全天'],['am','早高峰'],['pm','晚高峰']].map(([v, l]) => (
                <button key={v} className={`tab-btn${params?.timeRange===v?' active':''}`}
                  onClick={() => onParamsChange?.({ ...params, timeRange: v })}>{l}</button>
              ))}
            </div>
          </Row>

          {/* Prediction horizon */}
          <Row label="预测跨度">
            <div className="tab-group">
              {[['1d','1天'],['3d','3天'],['7d','7天']].map(([v, l]) => (
                <button key={v} className={`tab-btn${params?.horizon===v?' active':''}`}
                  onClick={() => onParamsChange?.({ ...params, horizon: v })}>{l}</button>
              ))}
            </div>
          </Row>

          {/* Model type */}
          <Row label="预测模型">
            <select className="dark-select" value={params?.model || 'lstm'}
              onChange={e => onParamsChange?.({ ...params, model: e.target.value })}>
              <option value="lstm">LSTM 深度学习</option>
              <option value="arima">ARIMA 时序</option>
              <option value="xgb">XGBoost 集成</option>
              <option value="ensemble">Ensemble 融合</option>
            </select>
          </Row>

          <div style={{ flex: 1 }} />

          {/* Query button */}
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: 8, fontSize: 13 }} onClick={onQuery}>
            开始预测分析
          </button>
          <button className="btn btn-ghost" style={{ width: '100%', fontSize: 12 }}>
            导出报告
          </button>

          {/* Model accuracy badge */}
          <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(0,229,160,.06)', border: '1px solid rgba(0,229,160,.15)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>模型精度 MAE</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>93.8%</span>
          </div>
        </div>
      )}
    </div>
  )
}
