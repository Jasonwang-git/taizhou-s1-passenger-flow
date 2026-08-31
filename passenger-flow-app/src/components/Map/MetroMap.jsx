import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Load rate color
function getLoadColor(rate) {
  if (rate >= 110) return '#ff4d6a'
  if (rate >= 90)  return '#ffaa2c'
  if (rate >= 70)  return '#4f8ef7'
  return '#00e5a0'
}

// Station popup HTML
function stationPopupHtml(props, flow) {
  const loadRate = flow?.loadRate ?? 0
  const color = getLoadColor(loadRate)
  return `
    <div style="padding:12px 16px;min-width:180px">
      <div style="font-size:14px;font-weight:700;color:#e8f0ff;margin-bottom:8px">${props.name}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="font-size:11px;color:#7a9cc4">实时客流</div>
        <div style="font-size:13px;font-weight:600;color:#00d4ff">${flow?.currentFlow?.toLocaleString() ?? '--'} 人</div>
        <div style="font-size:11px;color:#7a9cc4">满载率</div>
        <div style="font-size:13px;font-weight:600;color:${color}">${loadRate}%</div>
        <div style="font-size:11px;color:#7a9cc4">趋势</div>
        <div style="font-size:12px;color:${(flow?.trend ?? 0) > 0 ? '#ff4d6a' : '#00e5a0'}">
          ${(flow?.trend ?? 0) > 0 ? '▲' : '▼'} ${Math.abs(flow?.trend ?? 0)}%
        </div>
      </div>
      <div style="margin-top:8px;height:4px;border-radius:2px;background:rgba(255,255,255,.08)">
        <div style="height:100%;border-radius:2px;width:${Math.min(loadRate,100)}%;background:${color};transition:width .4s"></div>
      </div>
    </div>
  `
}

export default function MetroMap({ realtimeData = [], selectedStation, onStationClick }) {
  const mapRef   = useRef(null)
  const leafRef  = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (leafRef.current) return
    leafRef.current = L.map(mapRef.current, {
      center: [28.676, 121.474],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(leafRef.current)

    loadGeoJSON()
    return () => { leafRef.current?.remove(); leafRef.current = null }
  }, [])

  // Reload station markers when realtime data changes
  useEffect(() => {
    if (!leafRef.current || realtimeData.length === 0) return
    updateStationMarkers()
  }, [realtimeData, selectedStation])

  function loadGeoJSON() {
    fetch('/data/s1-line.geojson')
      .then(r => r.json())
      .then(geojson => {
        if (layerRef.current) { leafRef.current.removeLayer(layerRef.current) }

        layerRef.current = L.geoJSON(geojson, {
          filter: f => f.properties.type === 'line',
          style: () => ({
            color: '#4f8ef7',
            weight: 5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }),
        }).addTo(leafRef.current)

        // Draw glow effect (wider, translucent line)
        L.geoJSON(geojson, {
          filter: f => f.properties.type === 'line',
          style: () => ({
            color: '#00d4ff',
            weight: 14,
            opacity: 0.12,
            lineCap: 'round',
          }),
        }).addTo(leafRef.current)

        updateStationMarkers(geojson)
      })
      .catch(e => console.error('GeoJSON load failed:', e))
  }

  function updateStationMarkers(geojson) {
    // Remove old station layers
    leafRef.current.eachLayer(l => {
      if (l._isStationMarker) leafRef.current.removeLayer(l)
    })

    const stationFeatures = geojson
      ? geojson.features.filter(f => f.properties.type === 'station')
      : []

    stationFeatures.forEach(feature => {
      const props = feature.properties
      const [lng, lat] = feature.geometry.coordinates
      const flow = realtimeData.find(d => d.id === props.id)
      const loadRate = flow?.loadRate ?? 0
      const isSelected = selectedStation === props.id
      const color = isSelected ? '#fff' : getLoadColor(loadRate)
      const ringColor = isSelected ? '#4f8ef7' : getLoadColor(loadRate)
      const size = isSelected ? 14 : 10

      const icon = L.divIcon({
        className: '',
        iconSize: [size + 8, size + 8],
        iconAnchor: [(size + 8) / 2, (size + 8) / 2],
        html: `
          <div style="
            width:${size + 8}px; height:${size + 8}px;
            display:flex; align-items:center; justify-content:center;
            ${isSelected ? `animation: pulse 1.8s ease-in-out infinite;` : ''}
          ">
            <div style="
              width:${size}px; height:${size}px; border-radius:50%;
              background:${color};
              border: 2.5px solid ${ringColor};
              box-shadow: 0 0 ${isSelected ? 16 : 8}px ${ringColor};
            "></div>
          </div>`,
      })

      const marker = L.marker([lat, lng], { icon })
      marker._isStationMarker = true

      marker.bindPopup(stationPopupHtml(props, flow), { maxWidth: 220 })
      marker.on('click', () => onStationClick?.(props.id))
      marker.addTo(leafRef.current)

      // Station label
      const label = L.divIcon({
        className: '',
        iconSize: [80, 18],
        iconAnchor: [40, -4],
        html: `<div style="
          font-size:10px; color:#c8deff; white-space:nowrap;
          text-shadow: 0 1px 3px #000; font-weight:500; text-align:center;
          ${isSelected ? 'color:#4f8ef7;font-weight:700' : ''}
        ">${props.name}</div>`,
      })
      const labelMarker = L.marker([lat, lng], { icon: label, interactive: false })
      labelMarker._isStationMarker = true
      labelMarker.addTo(leafRef.current)
    })
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Legend overlay */}
      <div style={{
        position: 'absolute', bottom: 24, left: 16, zIndex: 1000,
        background: 'rgba(4,13,31,.85)', border: '1px solid rgba(79,142,247,.2)',
        borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontSize: 10, color: '#7a9cc4', marginBottom: 6, letterSpacing: 1 }}>满载率图例</div>
        {[
          { color: '#00e5a0', label: '< 70%  正常' },
          { color: '#4f8ef7', label: '70-90% 良好' },
          { color: '#ffaa2c', label: '90-110% 预警' },
          { color: '#ff4d6a', label: '> 110% 超载' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0, boxShadow: `0 0 6px ${item.color}` }} />
            <span style={{ fontSize: 10, color: '#a8c4e8' }}>{item.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, borderTop: '1px solid rgba(79,142,247,.15)', paddingTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 3, background: '#4f8ef7', borderRadius: 2, boxShadow: '0 0 8px #4f8ef7' }} />
          <span style={{ fontSize: 10, color: '#a8c4e8' }}>S1 线路</span>
        </div>
      </div>

      {/* Compass */}
      <div style={{
        position: 'absolute', top: 16, right: 16, zIndex: 1000,
        background: 'rgba(4,13,31,.8)', border: '1px solid rgba(79,142,247,.2)',
        borderRadius: '50%', width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, color: '#4f8ef7',
      }}>N</div>
    </div>
  )
}
