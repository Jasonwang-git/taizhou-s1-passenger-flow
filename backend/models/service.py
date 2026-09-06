"""预测服务：按 scope/method 调度。"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from etl.paths import ARTIFACTS_DIR, METRICS_PATH
from etl.station_map import SEGMENT_BY_ID
from models.classical import predict_arima, predict_prophet
from models.features import daily_line_flow, daily_section_flow, daily_station_flow
from models.history import predict_history
from models.lstm_model import predict_lstm
from models.xgboost_model import predict_xgb
from models.window_predict import run_window_predict

LINE_XGB = "xgb_line.joblib"
LINE_LSTM = "lstm_line.pt"
STATION_XGB_TMPL = "xgb_station_{sid}.joblib"
STATION_LSTM_TMPL = "lstm_station_{sid}.pt"
SECTION_XGB_TMPL = "xgb_section_{seg}.joblib"
SECTION_LSTM_TMPL = "lstm_section_{seg}.pt"


def _resolve_daily(scope: str, station_id: str | None, segment_id: str | None, channel: str) -> pd.DataFrame:
    if scope == "station":
        if not station_id:
            raise ValueError("站点预测需要 station_id")
        return daily_station_flow(station_id=station_id, channel=channel)
    if scope == "section":
        if not segment_id:
            raise ValueError("断面预测需要 segment_id")
        if segment_id not in SEGMENT_BY_ID:
            raise ValueError(f"未知断面: {segment_id}")
        return daily_section_flow(segment_id=segment_id, channel=channel)
    return daily_line_flow()


def _artifact_names(scope: str, station_id: str | None, segment_id: str | None) -> tuple[str, str]:
    if scope == "station":
        sid = station_id or "1"
        return STATION_XGB_TMPL.format(sid=sid), STATION_LSTM_TMPL.format(sid=sid)
    if scope == "section":
        seg = (segment_id or "1-2").replace("-", "_")
        return SECTION_XGB_TMPL.format(seg=seg), SECTION_LSTM_TMPL.format(seg=seg)
    return LINE_XGB, LINE_LSTM


def run_predict(req: dict) -> dict:
    scope = req.get("scope", "line")
    method = req.get("method", "history")
    station_id = req.get("station_id")
    segment_id = req.get("segment_id")
    channel = req.get("channel") or ""
    weather = req.get("weather_factor") or "none"
    event = req.get("event_factor") or "none"
    enable_correction = bool(req.get("enable_correction", True))
    granularity = (req.get("granularity") or "day").lower()

    # 小时 / 周 / 月：按所选区间聚合；日粒度且区间较长时也走窗口预测
    start_raw = req.get("start")
    end_raw = req.get("end") or req.get("as_of")
    if granularity in ("hour", "week", "month") or (start_raw and end_raw):
        # 日 + 短区间 + 已训练模型：仍可用 LSTM/XGB 等；否则窗口季节预测
        use_window = granularity != "day"
        if granularity == "day" and start_raw and end_raw:
            span = (pd.Timestamp(end_raw) - pd.Timestamp(start_raw)).days + 1
            if span > 30 or method == "history":
                use_window = True
        if use_window:
            result = run_window_predict(req)
            result["method"] = method
            return result

    horizon = int(req.get("horizon_days") or 7)
    if start_raw and end_raw and granularity == "day":
        span = (pd.Timestamp(end_raw) - pd.Timestamp(start_raw)).days + 1
        horizon = max(3, min(90, int(span)))

    as_of = end_raw or req.get("as_of")
    as_of_ts = pd.Timestamp(as_of).normalize() if as_of else None

    daily = _resolve_daily(scope, station_id, segment_id, channel)
    if daily.empty:
        raise ValueError("选定范围无可用历史数据，请先完成 ETL")

    data_end = pd.Timestamp(daily["date"].max()).normalize()
    if as_of_ts is None or as_of_ts > data_end:
        as_of_ts = data_end
    data_start = pd.Timestamp(daily["date"].min()).normalize()
    if as_of_ts < data_start + pd.Timedelta(days=horizon):
        as_of_ts = min(data_end, data_start + pd.Timedelta(days=max(horizon, 30)))

    xgb_name, lstm_name = _artifact_names(scope, station_id, segment_id)
    kwargs = dict(
        daily=daily,
        horizon=horizon,
        as_of=as_of_ts,
        weather=weather,
        event=event,
        enable_correction=enable_correction,
    )

    if method == "xgboost":
        result = predict_xgb(artifact_name=xgb_name, **kwargs)
    elif method == "lstm":
        result = predict_lstm(artifact_name=lstm_name, **kwargs)
    elif method == "arima":
        result = predict_arima(**kwargs)
    elif method == "prophet":
        result = predict_prophet(**kwargs)
    else:
        result = predict_history(**kwargs)

    result["scope"] = scope
    result["method"] = method
    result["granularity"] = "day"
    return result


def list_models() -> dict:
    arts = list(ARTIFACTS_DIR.glob("*")) if ARTIFACTS_DIR.exists() else []
    names = {p.name for p in arts}
    return {
        "artifacts": sorted(names),
        "methods": {
            "history": True,
            "arima": True,
            "prophet": True,
            "xgboost": any(n.startswith("xgb_") for n in names),
            "lstm": any(n.startswith("lstm_") for n in names),
        },
    }


def load_metrics() -> dict:
    if METRICS_PATH.exists():
        return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    return {"models": []}


def data_date_range() -> dict:
    """返回全线路日客流可用日期范围（供前端默认/校验）。"""
    try:
        daily = daily_line_flow()
        if daily.empty:
            return {"min": None, "max": None}
        dmin = pd.Timestamp(daily["date"].min()).normalize()
        dmax = pd.Timestamp(daily["date"].max()).normalize()
        return {"min": dmin.strftime("%Y-%m-%d"), "max": dmax.strftime("%Y-%m-%d")}
    except FileNotFoundError:
        return {"min": None, "max": None}
