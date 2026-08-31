#!/usr/bin/env python3
"""
从 OSM PBF 提取台州区域铁路/轨道交通，导出为 GeoJSON。
用法: python scripts/extract_osm_rail.py [输入.pbf] [输出.geojson]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import osmium

# 台州 S1 覆盖范围（min_lon, min_lat, max_lon, max_lat）
TAIZHOU_BBOX = (121.05, 28.25, 121.65, 28.85)

RAILWAY_TAGS = {
    "rail",
    "light_rail",
    "subway",
    "tram",
    "monorail",
    "narrow_gauge",
    "construction",
    "proposed",
}

STATION_TAGS = {"station", "halt", "stop"}


def in_bbox(lon: float, lat: float) -> bool:
    return (
        TAIZHOU_BBOX[0] <= lon <= TAIZHOU_BBOX[2]
        and TAIZHOU_BBOX[1] <= lat <= TAIZHOU_BBOX[3]
    )


class TaizhouRailExtractor(osmium.SimpleHandler):
    def __init__(self) -> None:
        super().__init__()
        self.ways: list[dict] = []
        self.stations: list[dict] = []
        self._count = 0

    def _tick(self) -> None:
        self._count += 1
        if self._count % 2_000_000 == 0:
            print(f"  已扫描 {self._count // 1_000_000}M 个要素…", flush=True)

    def node(self, n: osmium.osm.Node) -> None:
        self._tick()
        if not n.location.valid():
            return
        lon, lat = n.location.lon, n.location.lat
        if not in_bbox(lon, lat):
            return

        tags = {t.k: t.v for t in n.tags}
        railway = tags.get("railway")
        if railway in STATION_TAGS or tags.get("public_transport") == "station":
            name = tags.get("name") or tags.get("name:zh") or tags.get("name:en") or f"站{n.id}"
            self.stations.append(
                {
                    "id": str(n.id),
                    "name": name,
                    "lng": lon,
                    "lat": lat,
                    "tags": tags,
                }
            )

    def way(self, w: osmium.osm.Way) -> None:
        self._tick()
        tags = {t.k: t.v for t in w.tags}
        railway = tags.get("railway")
        if railway not in RAILWAY_TAGS:
            return

        coords: list[list[float]] = []
        touches_bbox = False
        for nr in w.nodes:
            if not nr.location.valid():
                return
            lon, lat = nr.location.lon, nr.location.lat
            coords.append([lon, lat])
            if in_bbox(lon, lat):
                touches_bbox = True

        if not touches_bbox or len(coords) < 2:
            return

        name = tags.get("name") or tags.get("name:zh") or tags.get("ref") or ""
        self.ways.append(
            {
                "id": str(w.id),
                "name": name,
                "railway": railway,
                "coords": coords,
                "tags": tags,
            }
        )


def to_geojson(ways: list[dict], stations: list[dict]) -> dict:
    features: list[dict] = []

    for way in ways:
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": way["id"],
                    "name": way["name"],
                    "railway": way["railway"],
                    "source": "osm",
                    **{
                        k: v
                        for k, v in way["tags"].items()
                        if k in ("operator", "ref", "colour", "line")
                    },
                },
                "geometry": {"type": "LineString", "coordinates": way["coords"]},
            }
        )

    for i, st in enumerate(stations):
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "id": st["id"],
                    "name": st["name"],
                    "order": i + 1,
                    "source": "osm",
                },
                "geometry": {"type": "Point", "coordinates": [st["lng"], st["lat"]]},
            }
        )

    return {"type": "FeatureCollection", "name": "台州轨道交通-OSM", "features": features}


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    pbf = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "china-260712.osm.pbf"
    out = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else root / "public" / "data" / "taizhou-rail-osm.geojson"
    )

    if not pbf.exists():
        print(f"找不到文件: {pbf}")
        sys.exit(1)

    print(f"读取: {pbf} ({pbf.stat().st_size / 1024 / 1024 / 1024:.2f} GB)")
    print(f"范围: 台州 bbox {TAIZHOU_BBOX}")
    print("正在扫描（全国 PBF 约需 2~5 分钟）...")

    handler = TaizhouRailExtractor()
    handler.apply_file(str(pbf), locations=True)

    geojson = to_geojson(handler.ways, handler.stations)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(geojson, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"线路: {len(handler.ways)} 条")
    print(f"站点: {len(handler.stations)} 个")
    print(f"已导出: {out}")

    if handler.ways:
        print("\n线路名称示例:")
        for w in handler.ways[:10]:
            print(f"  - {w['name'] or '(无名)'} [{w['railway']}]")
    if handler.stations:
        print("\n站点示例:")
        for s in handler.stations[:15]:
            print(f"  - {s['name']}")


if __name__ == "__main__":
    main()
