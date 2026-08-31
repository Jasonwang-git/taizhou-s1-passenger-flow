# 台州 S1 线客流预测系统

基于 React + TypeScript + Vite 的轨道交通客流预测大屏。中间为 **高德地图**，叠加 OSM 导出的线路 GeoJSON。

## 快速开始

```bash
npm install

# 配置高德 Key（.env）
# VITE_AMAP_KEY=你的Key

npm run dev
```

打开 http://localhost:5173

## 地图能力

| 能力 | 说明 |
|------|------|
| 底图 | 高德：标准 / 深色 / 卫星 |
| 线路数据 | 自动加载 `public/data/taizhou-rail-osm.geojson` |
| 搜索 | 左上角搜索线路名、站名 |
| 筛选 | 「仅 S1」/「全部铁路」 |
| 导入 | 顶部「导入线路」选择任意 `.geojson` |

## 技术栈

- React 19 + TypeScript + Vite
- 高德地图 JS API 2.0
- ECharts + Zustand + Tailwind CSS
