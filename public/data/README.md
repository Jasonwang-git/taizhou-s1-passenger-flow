# GeoJSON 线路数据说明

## 当前使用的线路

`public/data/s1-line.geojson` — 由 **台州S1线shp** 转换，坐标已转为 **GCJ-02**，系统启动后自动叠加到高德地图。

同目录还有：

| 文件 | 说明 |
|------|------|
| `s1-line.geojson` | GCJ-02，地图主数据（20 段折线） |
| `s1-line-wgs84.geojson` | WGS84 备份 |
| `s1-stations.json` | 站点参考 |
| `taizhou-rail-osm.geojson` | 早期 OSM 抽取结果（可选） |

## 从 Shapefile 重新生成

```bash
npm run convert-shp
# 或
python scripts/convert_s1_shp.py
```

依赖：`pip install pyshp`  
源目录：`台州S1线shp(1)/台州S1线shp/*.shp`

## 格式要求

标准 **GeoJSON FeatureCollection**，坐标顺序 **`[经度, 纬度]`**。

### 线路

```json
{
  "type": "Feature",
  "properties": { "name": "台州市域铁路S1线", "color": "#1E90FF" },
  "geometry": {
    "type": "LineString",
    "coordinates": [[121.37, 28.65], [121.40, 28.63]]
  }
}
```

支持 `MultiLineString`。站点仍使用代码中的 `STATIONS`（15 站），shp 本身不含站点。

## 坐标系

高德地图使用 **GCJ-02**。`s1-line.geojson` 已转换好，无需再纠偏。

若手动导入 WGS84 数据，需先转 GCJ-02，否则会偏移。

## 手动导入

顶部 **「导入线路」** 可选择任意 `.geojson` 临时覆盖当前线路。
