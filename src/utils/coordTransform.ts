/**
 * WGS84 → GCJ-02（火星坐标），用于 OSM 数据叠到高德地图
 * 参考公开纠偏算法
 */
const PI = Math.PI
const A = 6378245.0
const EE = 0.00669342162296594323

function outOfChina(lng: number, lat: number) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(lng: number, lat: number) {
  let ret =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(lng: number, lat: number) {
  let ret =
    300.0 +
    lng +
    2.0 * lat +
    0.1 * lng * lng +
    0.1 * lng * lat +
    0.1 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (outOfChina(lng, lat)) return [lng, lat]
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  return [lng + dLng, lat + dLat]
}

/** 将 GeoJSON 中所有坐标从 WGS84 转为 GCJ-02 */
export function geojsonWgs84ToGcj02(geojson: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  const convertCoords = (coords: unknown): unknown => {
    if (!Array.isArray(coords)) return coords
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const [lng, lat] = wgs84ToGcj02(coords[0] as number, coords[1] as number)
      return [lng, lat, ...coords.slice(2)]
    }
    return coords.map(convertCoords)
  }

  return {
    type: 'FeatureCollection',
    features: geojson.features.map((f) => {
      if (!f.geometry || f.geometry.type === 'GeometryCollection') return f
      return {
        ...f,
        geometry: {
          ...f.geometry,
          coordinates: convertCoords(
            (f.geometry as GeoJSON.Point | GeoJSON.LineString | GeoJSON.MultiLineString | GeoJSON.Polygon | GeoJSON.MultiPolygon)
              .coordinates,
          ) as never,
        } as GeoJSON.Geometry,
      }
    }),
  }
}
