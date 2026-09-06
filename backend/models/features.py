"""共用特征与时序工具。"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from etl.paths import HOURLY_SECTION_PATH, HOURLY_STATION_PATH

WEATHER_IMPACT = {
    "none": 0.0,
    "sunny": 0.02,
    "rain": -0.08,
    "wind": -0.04,
    "hot": -0.05,
    "cold": -0.03,
}

EVENT_IMPACT = {
    "none": 0.0,
    "holiday": 0.18,
    "concert": 0.25,
    "sports": 0.15,
    "school": 0.08,
}


def load_station_hourly() -> pd.DataFrame:
    if not HOURLY_STATION_PATH.exists():
        raise FileNotFoundError(f"请先运行 etl.build_hourly: {HOURLY_STATION_PATH}")
    return pd.read_parquet(HOURLY_STATION_PATH)


def load_section_hourly() -> pd.DataFrame:
    if not HOURLY_SECTION_PATH.exists():
        raise FileNotFoundError(f"请先运行 etl.build_od: {HOURLY_SECTION_PATH}")
    return pd.read_parquet(HOURLY_SECTION_PATH)


def daily_station_flow(
    df: pd.DataFrame | None = None,
    station_id: str | None = None,
    channel: str = "",
) -> pd.DataFrame:
    """按日汇总进+出站客流。channel 对站点小时表无效（无渠道），保留参数兼容。"""
    if df is None:
        df = load_station_hourly()
    x = df.copy()
    if station_id:
        x = x[x["station_id"] == str(station_id)]
    x["date"] = pd.to_datetime(x["datetime"]).dt.floor("D")
    g = x.groupby("date", as_index=False)["flow"].sum()
    g["date"] = pd.to_datetime(g["date"])
    return g.sort_values("date").reset_index(drop=True)


def daily_line_flow(df: pd.DataFrame | None = None) -> pd.DataFrame:
    return daily_station_flow(df, station_id=None)


def daily_section_flow(
    segment_id: str,
    channel: str = "",
    df: pd.DataFrame | None = None,
) -> pd.DataFrame:
    if df is None:
        df = load_section_hourly()
    x = df[df["segment_id"] == segment_id].copy()
    if channel in ("acc", "internet"):
        x = x[x["channel"] == channel]
    x["date"] = pd.to_datetime(x["datetime"]).dt.floor("D")
    g = x.groupby("date", as_index=False)["flow"].sum()
    g["date"] = pd.to_datetime(g["date"])
    return g.sort_values("date").reset_index(drop=True)


def apply_factors(values: np.ndarray, weather: str, event: str) -> np.ndarray:
    scale = 1.0 + WEATHER_IMPACT.get(weather, 0.0) + EVENT_IMPACT.get(event, 0.0)
    return np.maximum(0, np.round(values * scale)).astype(float)


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = y_true > 1
    if not mask.any():
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def format_dates(dates: pd.DatetimeIndex | list) -> list[str]:
    out = []
    for d in dates:
        ts = pd.Timestamp(d)
        out.append(f"{ts.month}/{ts.day}")
    return out


def build_lag_features(daily: pd.DataFrame, lags: list[int] | None = None) -> pd.DataFrame:
    lags = lags or [1, 2, 3, 7, 14]
    d = daily.copy().sort_values("date")
    for lag in lags:
        d[f"lag_{lag}"] = d["flow"].shift(lag)
    d["dow"] = d["date"].dt.dayofweek
    d["month"] = d["date"].dt.month
    d["is_weekend"] = (d["dow"] >= 5).astype(int)
    d["roll7"] = d["flow"].shift(1).rolling(7).mean()
    return d
