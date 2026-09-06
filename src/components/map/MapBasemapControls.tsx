import { useAppStore, type MapBasemap } from '@/store/useAppStore'

const BASEMAP_OPTIONS: { key: MapBasemap; label: string }[] = [
  { key: 'normal', label: '标准' },
  { key: 'satellite', label: '卫星' },
]

export default function MapBasemapControls() {
  const mapBasemap = useAppStore((s) => s.mapBasemap)
  const setMapBasemap = useAppStore((s) => s.setMapBasemap)

  return (
    <div className="pointer-events-none absolute bottom-12 left-1/2 z-[40] -translate-x-1/2">
      <div className="pointer-events-auto hud-panel mx-auto flex gap-1 p-1 shadow-panel">
        {BASEMAP_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`chip-btn min-w-[52px] !px-3 !py-1.5 ${mapBasemap === key ? 'active' : ''}`}
            onClick={() => setMapBasemap(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
