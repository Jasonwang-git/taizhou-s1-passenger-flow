"""
将 台州S1线shp 转为前端可用的 GeoJSON。

输出：
  public/data/s1-line.geojson       — GCJ-02（高德可直接叠加）
  public/data/s1-line-wgs84.geojson — WGS84 备份

依赖：pip install pyshp
用法：python scripts/convert_s1_shp.py
"""

from __future__ import annotations

import json
import sys
from math import cos, fabs, sin, sqrt
from pathlib import Path

try:
  import shapefile
except ImportError:
  import subprocess

  subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyshp', '-q'])
  import shapefile

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / 'public' / 'data'
LINE_NAME = '台州市域铁路S1线'

PI = 3.1415926535897932384626
A = 6378245.0
EE = 0.00669342162296594323


def out_of_china(lng: float, lat: float) -> bool:
  return not (72.004 <= lng <= 137.8347 and 0.8293 <= lat <= 55.8271)


def _transform_lat(lng: float, lat: float) -> float:
  ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * sqrt(fabs(lng))
  ret += (20.0 * sin(6.0 * lng * PI) + 20.0 * sin(2.0 * lng * PI)) * 2.0 / 3.0
  ret += (20.0 * sin(lat * PI) + 40.0 * sin(lat / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * sin(lat / 12.0 * PI) + 320 * sin(lat * PI / 30.0)) * 2.0 / 3.0
  return ret


def _transform_lng(lng: float, lat: float) -> float:
  ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * sqrt(fabs(lng))
  ret += (20.0 * sin(6.0 * lng * PI) + 20.0 * sin(2.0 * lng * PI)) * 2.0 / 3.0
  ret += (20.0 * sin(lng * PI) + 40.0 * sin(lng / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * sin(lng / 12.0 * PI) + 300.0 * sin(lng / 30.0 * PI)) * 2.0 / 3.0
  return ret


def wgs84_to_gcj02(lng: float, lat: float) -> tuple[float, float]:
  if out_of_china(lng, lat):
    return lng, lat
  dlat = _transform_lat(lng - 105.0, lat - 35.0)
  dlng = _transform_lng(lng - 105.0, lat - 35.0)
  radlat = lat / 180.0 * PI
  magic = sin(radlat)
  magic = 1 - EE * magic * magic
  sqrtmagic = sqrt(magic)
  dlat = (dlat * 180.0) / ((A * (1 - EE)) / (magic * sqrtmagic) * PI)
  dlng = (dlng * 180.0) / (A / sqrtmagic * cos(radlat) * PI)
  return lng + dlng, lat + dlat


def find_shp() -> Path:
  matches = list((ROOT / '台州S1线shp(1)').rglob('*.shp'))
  if not matches:
    matches = list(ROOT.rglob('**/S1*.shp'))
  if not matches:
    raise FileNotFoundError('未找到 S1 线 shapefile，请确认「台州S1线shp(1)」目录存在')
  return matches[0]


def shape_to_coords(shape: shapefile.Shape) -> list[list[list[float]]]:
  points = [[float(x), float(y)] for x, y in shape.points]
  parts = list(shape.parts) + [len(points)]
  lines: list[list[list[float]]] = []
  for i in range(len(parts) - 1):
    seg = points[parts[i] : parts[i + 1]]
    if len(seg) >= 2:
      lines.append(seg)
  return lines


def build_feature(lines: list[list[list[float]]], props: dict) -> dict:
  if len(lines) == 1:
    geometry = {'type': 'LineString', 'coordinates': lines[0]}
  else:
    geometry = {'type': 'MultiLineString', 'coordinates': lines}
  return {'type': 'Feature', 'properties': props, 'geometry': geometry}


def main() -> None:
  shp_path = find_shp()
  reader = shapefile.Reader(str(shp_path), encoding='utf-8', encodingErrors='replace')
  fields = [f[0] for f in reader.fields[1:]]

  features_wgs: list[dict] = []
  features_gcj: list[dict] = []

  for shape, rec in zip(reader.shapes(), reader.records()):
    raw = dict(zip(fields, rec))
    props = {
      'name': LINE_NAME,
      'lineCode': 'S1',
      'color': '#1E90FF',
      'osm_id': str(raw.get('osm_id') or ''),
      'fclass': str(raw.get('fclass') or 'subway'),
      'bridge': str(raw.get('bridge') or 'F'),
      'tunnel': str(raw.get('tunnel') or 'F'),
      'layer': int(raw.get('layer') or 0),
      'fid': int(raw.get('fid') or 0),
    }
    lines_wgs = shape_to_coords(shape)
    if not lines_wgs:
      continue
    lines_gcj = [
      [list(wgs84_to_gcj02(lng, lat)) for lng, lat in line] for line in lines_wgs
    ]
    features_wgs.append(build_feature(lines_wgs, props))
    features_gcj.append(build_feature(lines_gcj, props))

  OUT_DIR.mkdir(parents=True, exist_ok=True)

  fc_wgs = {
    'type': 'FeatureCollection',
    'name': LINE_NAME,
    'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:OGC:1.3:CRS84'}},
    'features': features_wgs,
  }
  fc_gcj = {
    'type': 'FeatureCollection',
    'name': LINE_NAME,
    'properties': {
      'coordSystem': 'GCJ-02',
      'source': '台州S1线shp',
      'note': '已从 WGS84 转为 GCJ-02，可直接叠高德地图',
    },
    'features': features_gcj,
  }

  wgs_path = OUT_DIR / 's1-line-wgs84.geojson'
  gcj_path = OUT_DIR / 's1-line.geojson'
  wgs_path.write_text(json.dumps(fc_wgs, ensure_ascii=False), encoding='utf-8')
  gcj_path.write_text(json.dumps(fc_gcj, ensure_ascii=False), encoding='utf-8')

  print(f'源文件: {shp_path}')
  print(f'线段数: {len(features_gcj)}')
  print(f'已写入: {gcj_path.relative_to(ROOT)} (GCJ-02)')
  print(f'已写入: {wgs_path.relative_to(ROOT)} (WGS84)')


if __name__ == '__main__':
  main()
