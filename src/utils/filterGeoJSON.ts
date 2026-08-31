/** 按名称关键字过滤线路/站点 GeoJSON */
export function filterGeoJSONByKeyword(
  geojson: GeoJSON.FeatureCollection,
  keyword: string,
): GeoJSON.FeatureCollection {
  const q = keyword.trim().toLowerCase()
  if (!q) return geojson

  const matched = geojson.features.filter((f) => {
    const props = (f.properties ?? {}) as Record<string, unknown>
    const name = String(props.name ?? props.ref ?? '').toLowerCase()
    const railway = String(props.railway ?? '').toLowerCase()
    return name.includes(q) || railway.includes(q)
  })

  return {
    type: 'FeatureCollection',
    features: matched,
  }
}

/** 仅保留「台州市域铁路S1线」线段（不含 S2） */
export function filterS1Line(geojson: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const s1Lines = geojson.features.filter((f) => {
    const name = String((f.properties as { name?: string } | null)?.name ?? '')
    // 精确匹配 S1，排除 S2
    return /市域铁路S1|S1线/.test(name) && !/S2/.test(name) && f.geometry.type !== 'Point'
  })

  if (s1Lines.length === 0) {
    // 兜底：名称含 S1 的线
    const fallback = geojson.features.filter((f) => {
      const name = String((f.properties as { name?: string } | null)?.name ?? '')
      return name.includes('S1') && !name.includes('S2') && f.geometry.type !== 'Point'
    })
    return { type: 'FeatureCollection', features: fallback }
  }

  return { type: 'FeatureCollection', features: s1Lines }
}

/** 从 GeoJSON 提取可搜索的线路/站点名称列表 */
export function listSearchableNames(geojson: GeoJSON.FeatureCollection): string[] {
  const set = new Set<string>()
  for (const f of geojson.features) {
    const name = String((f.properties as { name?: string } | null)?.name ?? '').trim()
    if (name) set.add(name)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}
