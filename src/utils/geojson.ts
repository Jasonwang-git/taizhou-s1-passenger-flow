import type { Station } from '@/types'

export interface ParsedLineGeoJSON {
  linePaths: Array<Array<[number, number]>>
  stations: Station[]
}

/** GeoJSON 坐标为 [lng, lat]，高德 Path 为 [lng, lat] */
function toLngLat(coord: number[]): [number, number] | null {
  if (!Array.isArray(coord) || coord.length < 2) return null
  const lng = Number(coord[0])
  const lat = Number(coord[1])
  if (Number.isNaN(lng) || Number.isNaN(lat)) return null
  return [lng, lat]
}

function collectLinePaths(geometry: GeoJSON.Geometry): Array<Array<[number, number]>> {
  if (geometry.type === 'LineString') {
    const path = geometry.coordinates
      .map((c) => toLngLat(c as number[]))
      .filter((p): p is [number, number] => p !== null)
    return path.length >= 2 ? [path] : []
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates
      .map((line) =>
        line
          .map((c) => toLngLat(c as number[]))
          .filter((p): p is [number, number] => p !== null),
      )
      .filter((path) => path.length >= 2)
  }
  return []
}

/**
 * 解析线路 GeoJSON：
 * - LineString / MultiLineString → 线路
 * - Point → 站点（properties.name / id / order）
 * 若只有线路没有 Point，则用线路折点自动生成临时站点
 */
export function parseLineGeoJSON(geojson: GeoJSON.FeatureCollection): ParsedLineGeoJSON {
  const linePaths: Array<Array<[number, number]>> = []
  const stations: Station[] = []

  for (const feature of geojson.features) {
    if (!feature.geometry) continue
    const { geometry, properties } = feature
    const props = (properties ?? {}) as Record<string, unknown>

    if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
      linePaths.push(...collectLinePaths(geometry))
    }

    if (geometry.type === 'Point') {
      const pos = toLngLat(geometry.coordinates as number[])
      if (!pos) continue
      const [lng, lat] = pos
      stations.push({
        id: String(props.id ?? props.stationId ?? `p-${stations.length + 1}`),
        name: String(props.name ?? props.stationName ?? `站点${stations.length + 1}`),
        lng,
        lat,
        order: Number(props.order ?? stations.length + 1),
      })
    }
  }

  // 仅有线、无点时：只标首尾端点，避免折点爆炸
  if (stations.length === 0 && linePaths[0]?.length) {
    const path = linePaths[0]
    const ends = [path[0], path[path.length - 1]].filter(Boolean) as Array<[number, number]>
    ends.forEach(([lng, lat], i) => {
      stations.push({
        id: `end-${i + 1}`,
        name: i === 0 ? '起点' : '终点',
        lng,
        lat,
        order: i + 1,
      })
    })
  }

  stations.sort((a, b) => a.order - b.order)

  // 无独立线路时，用站点顺序连线
  if (linePaths.length === 0 && stations.length >= 2) {
    linePaths.push(stations.map((s) => [s.lng, s.lat] as [number, number]))
  }

  return { linePaths, stations }
}

export function stationsToLinePath(stations: Station[]): Array<[number, number]> {
  return stations.map((s) => [s.lng, s.lat])
}
