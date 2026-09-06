"""项目路径约定。"""

from __future__ import annotations

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_ROOT.parent
RAW_DATA_DIR = REPO_ROOT / "数据"
PARQUET_DIR = BACKEND_ROOT / "data" / "parquet"
ARTIFACTS_DIR = BACKEND_ROOT / "artifacts"

HOURLY_STATION_PATH = PARQUET_DIR / "hourly_station.parquet"
HOURLY_OD_PATH = PARQUET_DIR / "hourly_od.parquet"
HOURLY_SECTION_PATH = PARQUET_DIR / "hourly_section.parquet"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"

FULL_STATION_XLSX = RAW_DATA_DIR / "台州数据全站点.xlsx"
ACC_XLSX = RAW_DATA_DIR / "ACC交易.xlsx"
NET_XLSX = RAW_DATA_DIR / "互联网交易.xlsx"


def ensure_dirs() -> None:
    PARQUET_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
