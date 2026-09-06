# 台州 S1 客流预测后端

FastAPI 服务：读取 `数据/` 下 Excel，清洗为 Parquet，训练 XGBoost / LSTM 等模型，向前端提供 `/api/predict`。

## 环境

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
# 若需 LSTM：
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

## 数据准备（ETL）

```bash
# 全站点小时表 → data/parquet/hourly_station.parquet
python -m etl.build_hourly

# ACC + 互联网交易 → hourly_od.parquet + hourly_section.parquet
# （Excel 较大，可能需数分钟）
python -m etl.build_od

# 数据中心明细预览（各渠道约 2500 条）→ public/data/acc-trips.json
python -m etl.export_acc_preview
```

原始文件路径（相对仓库根目录）：

- `数据/台州数据全站点.xlsx`
- `数据/ACC交易.xlsx`
- `数据/互联网交易.xlsx`

## 训练

```bash
# 全线 + 15 站 XGBoost / LSTM
python -m train.train_station

# 相邻断面（依赖 build_od）
python -m train.train_section
```

产物目录：`artifacts/`（`*.joblib` / `*.pt` / `metrics.json`）

## 启动 API

在 `backend/` 目录：

```bash
uvicorn app.main:app --reload --port 8000
```

- 文档：http://127.0.0.1:8000/docs  
- 健康检查：`GET /api/health`  
- 预测：`POST /api/predict`  
- 模型列表：`GET /api/models`  
- 指标：`GET /api/metrics`
- 数据中心底座：`GET /api/data-hub`
- 明细抽查：`GET /api/acc-records`

### 预测请求示例

```json
{
  "scope": "line",
  "method": "xgboost",
  "horizon_days": 7,
  "weather_factor": "none",
  "event_factor": "none",
  "enable_correction": true,
  "channel": ""
}
```

`scope=station` 时传 `station_id`（`"1"`–`"15"`）；`scope=section` 时传 `segment_id`（如 `"9-10"`）。

未训练的 XGBoost/LSTM 会自动回退到历史均值法。

## 前端联调

仓库根目录 `.env`：

```
VITE_API_BASE=http://127.0.0.1:8000
```

然后 `npm run dev`。客流预测页会请求后端；失败时 toast 提示并回退本地演示数据。

## 方法说明

| method   | 说明 |
|----------|------|
| history  | 同星期几均值 |
| xgboost  | 滞后 + 日历特征 |
| lstm     | 日序列多步（CPU） |
| arima    | statsmodels ARIMA，失败回退 history |
| prophet  | 若已安装 Prophet 则使用，否则季节朴素 |

天气/事件因子无真实标签时，按规则对预测值做缩放。

## 断面定义（第一版）

相邻站对起讫 OD 计数（双向合计到同一 `segment_id`）。非相邻 OD 未做路径分配。
