import { useState, useEffect, useCallback } from 'react'
import Header from './components/Panels/Header'
import LeftPanel from './components/Panels/LeftPanel'
import RightPanel from './components/Panels/RightPanel'
import MetroMap from './components/Map/MetroMap'
import {
  genHourlyFlow, genSectionLoad, genWeekPrediction,
  genStationRanking, genRealtimeStatus, genImbalanceData,
} from './data/mockData'

function getTime() {
  const now = new Date()
  return {
    time: now.toLocaleTimeString('zh-CN', { hour12: false }),
    date: now.toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    }),
  }
}

export default function App() {
  const [selectedStation, setSelectedStation] = useState('5')
  const [params, setParams] = useState({
    mode: 'station', dir: 'down',
    startDate: '2025-07-12', endDate: '2025-07-18',
    timeRange: 'all', horizon: '7d', model: 'lstm',
  })
  const [currentTime, setCurrentTime] = useState(getTime())
  const [flowData,      setFlowData]      = useState(() => genHourlyFlow('5'))
  const [loadData,      setLoadData]      = useState(() => genSectionLoad())
  const [predData,      setPredData]      = useState(() => genWeekPrediction())
  const [imbalanceData, setImbalanceData] = useState(() => genImbalanceData())
  const [rankData,      setRankData]      = useState(() => genStationRanking())
  const [realtimeData,  setRealtimeData]  = useState(() => genRealtimeStatus())

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(getTime()), 1000)
    return () => clearInterval(t)
  }, [])

  // Refresh realtime every 30s
  useEffect(() => {
    const t = setInterval(() => setRealtimeData(genRealtimeStatus()), 30000)
    return () => clearInterval(t)
  }, [])

  const handleStationChange = useCallback((id) => {
    setSelectedStation(id)
    setFlowData(genHourlyFlow(id))
    setLoadData(genSectionLoad())
  }, [])

  const handleQuery = useCallback(() => {
    setFlowData(genHourlyFlow(selectedStation))
    setLoadData(genSectionLoad())
    setPredData(genWeekPrediction())
    setImbalanceData(genImbalanceData())
    setRankData(genStationRanking())
    setRealtimeData(genRealtimeStatus())
  }, [selectedStation])

  const stationInfo = realtimeData.find(d => d.id === selectedStation)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      overflow: 'hidden', background: 'var(--bg-deep)',
    }}>
      {/* ── Header ── */}
      <Header currentTime={currentTime} />

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* Left */}
        <LeftPanel
          selectedStation={selectedStation}
          onStationChange={handleStationChange}
          params={params}
          onParamsChange={setParams}
          onQuery={handleQuery}
        />

        {/* Center map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
          <MetroMap
            realtimeData={realtimeData}
            selectedStation={selectedStation}
            onStationClick={handleStationChange}
          />

          {/* Selected station info pill */}
          {stationInfo && (
            <div style={{
              position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: 'rgba(7,20,40,.92)',
              border: '1px solid var(--border-bright)', borderRadius: 10,
              padding: '8px 18px', backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', gap: 18,
              boxShadow: 'var(--glow-blue)', whiteSpace: 'nowrap',
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 1 }}>选中站点</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{stationInfo.name}</div>
              </div>
              {[
                { label: '实时客流', val: stationInfo.currentFlow.toLocaleString(), unit: '人', color: 'var(--cyan)' },
                { label: '满载率', val: `${stationInfo.loadRate}%`, color: stationInfo.loadRate >= 110 ? 'var(--red)' : stationInfo.loadRate >= 90 ? 'var(--orange)' : 'var(--green)' },
                { label: '趋势', val: `${stationInfo.trend > 0 ? '▲' : '▼'} ${Math.abs(stationInfo.trend)}%`, color: stationInfo.trend > 0 ? 'var(--red)' : 'var(--green)' },
              ].map(item => (
                <div key={item.label} style={{ borderLeft: '1px solid var(--border)', paddingLeft: 18, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color, textShadow: `0 0 8px ${item.color}` }}>{item.val}</div>
                </div>
              ))}
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 18 }}>
                <span className={`alert-badge ${stationInfo.alert}`}>
                  {stationInfo.alert === 'danger' ? '⚠ 超载' : stationInfo.alert === 'warning' ? '⚡ 预警' : '✓ 正常'}
                </span>
              </div>
            </div>
          )}

          {/* Bottom status strip */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 900,
            background: 'linear-gradient(0deg, rgba(4,13,31,.9), transparent)',
            padding: '18px 16px 8px',
            display: 'flex', justifyContent: 'center', gap: 28,
          }}>
            {['上行 正常运营', '下行 正常运营', '全线 无延误', '当前 平峰时段'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 5px var(--green)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <RightPanel
          flowData={flowData}
          loadData={loadData}
          predData={predData}
          imbalanceData={imbalanceData}
          rankData={rankData}
          selectedStation={selectedStation}
          realtimeData={realtimeData}
        />
      </div>
    </div>
  )
}
