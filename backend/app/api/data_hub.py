"""数据中心：数据接入状态 + 统计底座概览。"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

from etl.paths import (
    ACC_XLSX,
    FULL_STATION_XLSX,
    HOURLY_OD_PATH,
    HOURLY_SECTION_PATH,
    HOURLY_STATION_PATH,
    METRICS_PATH,
    NET_XLSX,
    PARQUET_DIR,
    REPO_ROOT,
)
from models.service import data_date_range, list_models

router = APIRouter(prefix="/api")

PREVIEW_BACKEND = Path(__file__).resolve().parent.parent.parent / "data" / "json" / "acc_trips.json"
PREVIEW_PUBLIC = REPO_ROOT / "public" / "data" / "acc-trips.json"


def _rel(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return path.name


def _file_info(path: Path, role: str, label: str) -> dict:
    exists = path.exists()
    return {
        "id": path.stem,
        "label": label,
        "role": role,
        "name": path.name,
        "path": _rel(path) if exists else path.name,
        "exists": exists,
        "sizeMb": round(path.stat().st_size / 1e6, 2) if exists else 0,
        "mtime": path.stat().st_mtime if exists else None,
    }


def _parquet_stats(path: Path, time_col: str = "datetime") -> dict:
    if not path.exists():
        return {"exists": False, "rows": 0, "min": None, "max": None}
    try:
        import pyarrow.parquet as pq

        pf = pq.ParquetFile(path)
        rows = int(pf.metadata.num_rows) if pf.metadata else 0
        dmin = dmax = None
        # 优先用 row group 统计，避免整列读入
        try:
            col_idx = pf.schema_arrow.get_field_index(time_col)
        except Exception:
            col_idx = -1
        if col_idx >= 0 and pf.metadata:
            mins, maxs = [], []
            for i in range(pf.metadata.num_row_groups):
                rg = pf.metadata.row_group(i)
                if col_idx >= rg.num_columns:
                    continue
                col = rg.column(col_idx)
                stats = col.statistics
                if stats and stats.has_min_max:
                    mins.append(stats.min)
                    maxs.append(stats.max)
            if mins and maxs:
                dmin = pd.Timestamp(min(mins))
                dmax = pd.Timestamp(max(maxs))
        if dmin is None or dmax is None:
            df = pd.read_parquet(path, columns=[time_col])
            ts = pd.to_datetime(df[time_col], errors="coerce")
            dmin, dmax = ts.min(), ts.max()
            rows = int(len(df))
        return {
            "exists": True,
            "rows": rows,
            "min": None if pd.isna(dmin) else pd.Timestamp(dmin).strftime("%Y-%m-%d"),
            "max": None if pd.isna(dmax) else pd.Timestamp(dmax).strftime("%Y-%m-%d"),
        }
    except Exception as e:
        return {"exists": True, "rows": 0, "min": None, "max": None, "error": str(e)}


def _preview_meta() -> dict:
    for path in (PREVIEW_BACKEND, PREVIEW_PUBLIC):
        if path.exists():
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
                return {
                    "exists": True,
                    "count": payload.get("count") or len(payload.get("records") or []),
                    "accCount": payload.get("accCount"),
                    "internetCount": payload.get("internetCount"),
                    "note": payload.get("note"),
                    "source": payload.get("source"),
                }
            except Exception:
                continue
    return {"exists": False, "count": 0}


@router.get("/data-hub")
def data_hub():
    """数据接入清单 + ETL 统计底座状态。"""
    raw_files = [
        _file_info(FULL_STATION_XLSX, "raw", "全站点小时客流"),
        _file_info(ACC_XLSX, "raw", "ACC 交易明细"),
        _file_info(NET_XLSX, "raw", "互联网交易明细"),
    ]

    station = _parquet_stats(HOURLY_STATION_PATH, "datetime")
    od = _parquet_stats(HOURLY_OD_PATH, "datetime")
    section = _parquet_stats(HOURLY_SECTION_PATH, "datetime")

    # 日汇总范围（预测底座）
    try:
        daily_range = data_date_range()
    except Exception:
        daily_range = {"min": None, "max": None}

    models = list_models()
    metrics = {}
    if METRICS_PATH.exists():
        try:
            metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
        except Exception:
            metrics = {}

    preview = _preview_meta()

    etl_ready = bool(station.get("exists") and station.get("rows", 0) > 0)
    od_ready = bool(od.get("exists") and od.get("rows", 0) > 0)
    models_ready = bool(models.get("methods", {}).get("xgboost") or models.get("methods", {}).get("lstm"))

    pipeline = [
        {
            "step": 1,
            "name": "原始接入",
            "desc": "数据/ 目录下 Excel",
            "status": "ok" if all(f["exists"] for f in raw_files) else "warn",
            "detail": f"{sum(1 for f in raw_files if f['exists'])}/{len(raw_files)} 个文件就绪",
        },
        {
            "step": 2,
            "name": "ETL 清洗",
            "desc": "小时站/OD/断面 Parquet",
            "status": "ok" if etl_ready else "missing",
            "detail": "python -m etl.build_hourly && python -m etl.build_od",
        },
        {
            "step": 3,
            "name": "统计底座",
            "desc": "日客流汇总 · 预测 as_of 区间",
            "status": "ok" if daily_range.get("min") and daily_range.get("max") else "missing",
            "detail": (
                f"{daily_range.get('min')} ~ {daily_range.get('max')}"
                if daily_range.get("min")
                else "请先完成 ETL"
            ),
        },
        {
            "step": 4,
            "name": "模型产物",
            "desc": "XGBoost / LSTM artifacts",
            "status": "ok" if models_ready else "warn",
            "detail": f"artifacts {len(models.get('artifacts') or [])} 个",
        },
    ]

    result = {
        "role": "数据接入 + 统计底座",
        "summary": {
            "rawReady": all(f["exists"] for f in raw_files),
            "etlReady": etl_ready,
            "odReady": od_ready,
            "modelsReady": models_ready,
            "previewReady": bool(preview.get("exists")),
            "stationHours": station.get("rows", 0),
            "odHours": od.get("rows", 0),
            "sectionHours": section.get("rows", 0),
            "dateMin": daily_range.get("min") or station.get("min"),
            "dateMax": daily_range.get("max") or station.get("max"),
            "previewCount": preview.get("count", 0),
            "modelCount": len(models.get("artifacts") or []),
        },
        "rawFiles": raw_files,
        "etl": {
            "hourlyStation": {**station, "label": "站点小时客流", "file": HOURLY_STATION_PATH.name},
            "hourlyOd": {**od, "label": "OD 小时客流", "file": HOURLY_OD_PATH.name},
            "hourlySection": {**section, "label": "断面小时客流", "file": HOURLY_SECTION_PATH.name},
            "parquetDir": _rel(PARQUET_DIR) if PARQUET_DIR.exists() else "backend/data/parquet",
            "rawDir": "数据",
        },
        "preview": preview,
        "models": {
            "methods": models.get("methods") or {},
            "artifacts": models.get("artifacts") or [],
            "metricsCount": len((metrics.get("models") or [])),
            "artifactsDir": "backend/artifacts",
        },
        "pipeline": pipeline,
        "usage": [
            "原始 Excel 留在「数据/」，作为系统唯一接入源",
            "ETL 生成 Parquet，作为客流分析与预测的统计底座",
            "数据中心展示接入状态与底座指标，不在浏览器展示全量明细",
            "客流预测与分析读取底座汇总，而非原始交易行",
        ],
    }

    try:
        snap = REPO_ROOT / "public" / "data" / "data-hub.json"
        snap.parent.mkdir(parents=True, exist_ok=True)
        snap.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass

    return result


@router.get("/data-hub/fallback")
def data_hub_fallback():
    """无 pandas 环境时的轻量占位（一般不用）。"""
    raise HTTPException(status_code=404, detail="use /api/data-hub")
