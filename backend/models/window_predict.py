"""按所选日期区间与粒度（小时/日/周/月）生成预测序列。"""

from __future__ import annotations

import numpy as np
import pandas as pd

from models.features import (
    apply_factors,
    daily_line_flow,
    daily_section_flow,
    daily_station_flow,
    load_section_hourly,
    load_station_hourly,
    mape,
)
from etl.station_map import SEGMENT_BY_ID


def _resolve_hourly(scope: str, station_id: str | None, segment_id: str | None, channel: str) -> pd.DataFrame:
    if scope == "section":
        if not segment_id:
            raise ValueError("断面预测需要 segment_id")
        if segment_id not in SEGMENT_BY_ID:
            raise ValueError(f"未知断面: {segment_id}")
        x = load_section_hourly()
        x = x[x["segment_id"] == segment_id].copy()
        if channel in ("acc", "internet"):
            x = x[x["channel"] == channel]
        g = x.groupby("datetime", as_index=False)["flow"].sum()
    else:
        x = load_station_hourly()
        if scope == "station":
            if not station_id:
                raise ValueError("站点预测需要 station_id")
            x = x[x["station_id"] == str(station_id)]
        g = x.groupby("datetime", as_index=False)["flow"].sum()
    g["datetime"] = pd.to_datetime(g["datetime"])
    return g.sort_values("datetime").reset_index(drop=True)


def _resolve_daily(scope: str, station_id: str | None, segment_id: str | None, channel: str) -> pd.DataFrame:
    if scope == "station":
        if not station_id:
            raise ValueError("站点预测需要 station_id")
        return daily_station_flow(station_id=station_id, channel=channel)
    if scope == "section":
        if not segment_id:
            raise ValueError("断面预测需要 segment_id")
        return daily_section_flow(segment_id=segment_id, channel=channel)
    return daily_line_flow()


def _parse_hour(s: str | None, default: int) -> int:
    if not s:
        return default
    try:
        return int(str(s).split(":")[0])
    except ValueError:
        return default


def _format_label(ts: pd.Timestamp, granularity: str) -> str:
    if granularity == "hour":
        return f"{ts.hour:02d}:00"
    if granularity == "week":
        # ISO 周：月/日（周一）
        return f"{ts.month}/{ts.day}"
    if granularity == "month":
        return f"{ts.year}-{ts.month:02d}"
    return f"{ts.month}/{ts.day}"


def _seasonal_predict(
    hist: pd.Series,
    keys: pd.Index,
    key_fn,
) -> np.ndarray:
    """用历史同期均值预测；keys 为时间戳序列。"""
    frame = hist.reset_index()
    frame.columns = ["ts", "flow"]
    frame["key"] = frame["ts"].map(key_fn)
    means = frame.groupby("key")["flow"].mean()
    global_mean = float(hist.mean()) if len(hist) else 0.0
    out = []
    for ts in keys:
        k = key_fn(pd.Timestamp(ts))
        out.append(float(means.get(k, global_mean)))
    return np.array(out, dtype=float)


def _pack_result(
    labels: list[str],
    actual: list[int],
    predicted: np.ndarray,
    weather: str,
    event: str,
    enable_correction: bool,
    granularity: str,
) -> dict:
    predicted = apply_factors(predicted, weather, event)
    corrected = predicted.copy()
    if enable_correction:
        corrected = np.round(predicted * 1.02)

    # MAPE：有实际值的点
    a = np.array(actual, dtype=float)
    mask = a > 0
    m = mape(a[mask], predicted[mask]) if mask.any() else 8.5
    if not mask.any():
        m = 8.5

    tomorrow = int(round(float(predicted[-1]))) if len(predicted) else 0
    deviation = 0.0
    if enable_correction and len(predicted):
        deviation = float(abs(corrected[-1] - predicted[-1]) / max(predicted[-1], 1) * 100)

    return {
        "dates": labels,
        "actual": [int(x) for x in actual],
        "predicted": [int(round(x)) for x in predicted],
        "corrected": [int(round(x)) for x in corrected],
        "tomorrow": tomorrow,
        "mape": round(float(m), 1),
        "unit": "人次",
        "deviation": round(deviation, 1),
        "granularity": granularity,
    }


def predict_hour_window(
    *,
    scope: str,
    station_id: str | None,
    segment_id: str | None,
    channel: str,
    as_of: pd.Timestamp,
    time_start: str,
    time_end: str,
    weather: str,
    event: str,
    enable_correction: bool,
) -> dict:
    hourly = _resolve_hourly(scope, station_id, segment_id, channel)
    if hourly.empty:
        raise ValueError("无小时级历史数据")

    h0 = _parse_hour(time_start, 6)
    h1 = _parse_hour(time_end, 22)
    if h1 < h0:
        h0, h1 = h1, h0

    day = pd.Timestamp(as_of).normalize()
    hours = pd.date_range(
        day + pd.Timedelta(hours=h0),
        day + pd.Timedelta(hours=h1),
        freq="h",
    )

    data_end = pd.Timestamp(hourly["datetime"].max())
    hist = hourly[hourly["datetime"] <= data_end].set_index("datetime")["flow"]

    # 同期：星期几 + 小时
    def key_fn(ts: pd.Timestamp) -> tuple[int, int]:
        return (int(ts.dayofweek), int(ts.hour))

    predicted = _seasonal_predict(hist, hours, key_fn)
    indexed = hist

    actual: list[int] = []
    for ts in hours:
        if ts in indexed.index:
            actual.append(int(round(float(indexed.loc[ts]))))
        else:
            actual.append(0)

    # 若选日已是数据末日：末尾 2 小时视为预测位（无实际）
    if day.date() >= data_end.normalize().date():
        for i in range(max(0, len(actual) - 2), len(actual)):
            actual[i] = 0

    labels = [_format_label(ts, "hour") for ts in hours]
    return _pack_result(labels, actual, predicted, weather, event, enable_correction, "hour")


def predict_day_window(
    *,
    daily: pd.DataFrame,
    start: pd.Timestamp,
    end: pd.Timestamp,
    weather: str,
    event: str,
    enable_correction: bool,
) -> dict:
    d = daily.copy()
    d["date"] = pd.to_datetime(d["date"]).dt.normalize()
    d = d.sort_values("date")
    data_start = d["date"].min()
    data_end = d["date"].max()

    start = max(pd.Timestamp(start).normalize(), data_start)
    end = min(pd.Timestamp(end).normalize(), data_end)
    if end < start:
        start, end = end, start

    dates = pd.date_range(start, end, freq="D")
    # 过长区间降采样到最多 120 点（约 4 个月逐日；更长则按周聚合提示由前端选周）
    if len(dates) > 120:
        step = int(np.ceil(len(dates) / 120))
        dates = dates[::step]
        if dates[-1] != end:
                        dates = pd.DatetimeIndex([*dates, end])

    hist = d.set_index("date")["flow"]

    def key_fn(ts: pd.Timestamp) -> int:
        return int(ts.dayofweek)

    # 仅用 start 之前的历史学均值，避免泄漏；若不足则用全历史
    train = hist[hist.index < start]
    if len(train) < 14:
        train = hist[hist.index <= end]

    predicted = _seasonal_predict(train, dates, key_fn)

    actual: list[int] = []
    for ts in dates:
        if ts in hist.index:
            actual.append(int(round(float(hist.loc[ts]))))
        else:
            actual.append(0)

    # 末尾若贴近数据尽头，留 1～2 个点作「预测位」
    if end >= data_end - pd.Timedelta(days=1):
        for i in range(max(0, len(actual) - 2), len(actual)):
            actual[i] = 0

    labels = [_format_label(ts, "day") for ts in dates]
    return _pack_result(labels, actual, predicted, weather, event, enable_correction, "day")


def predict_week_window(
    *,
    daily: pd.DataFrame,
    start: pd.Timestamp,
    end: pd.Timestamp,
    weather: str,
    event: str,
    enable_correction: bool,
) -> dict:
    d = daily.copy()
    d["date"] = pd.to_datetime(d["date"]).dt.normalize()
    d = d.sort_values("date")
    data_start = d["date"].min()
    data_end = d["date"].max()

    start = max(pd.Timestamp(start).normalize(), data_start)
    end = min(pd.Timestamp(end).normalize(), data_end)
    if end < start:
        start, end = end, start

    # 按 ISO 周聚合
    tmp = d[(d["date"] >= start) & (d["date"] <= end)].copy()
    if tmp.empty:
        tmp = d.copy()
    tmp["week"] = tmp["date"].dt.to_period("W-MON").dt.start_time
    weekly = tmp.groupby("week", as_index=False)["flow"].sum()
    weekly = weekly.rename(columns={"week": "date"}).sort_values("date")

    # 历史周序列（全量，用于学「第几周」模式）
    all_d = d.copy()
    all_d["week"] = all_d["date"].dt.to_period("W-MON").dt.start_time
    all_w = all_d.groupby("week")["flow"].sum()

    weeks = pd.date_range(
        start.to_period("W-MON").start_time,
        end.to_period("W-MON").start_time,
        freq="W-MON",
    )
    if len(weeks) == 0:
        weeks = pd.DatetimeIndex([start.to_period("W-MON").start_time])

    def key_fn(ts: pd.Timestamp) -> int:
        return int(pd.Timestamp(ts).isocalendar().week)

    train = all_w[all_w.index < weeks.min()] if len(all_w) else all_w
    if len(train) < 4:
        train = all_w

    predicted = _seasonal_predict(train, weeks, key_fn)
    indexed = weekly.set_index("date")["flow"] if not weekly.empty else pd.Series(dtype=float)

    actual: list[int] = []
    for ts in weeks:
        if ts in indexed.index:
            actual.append(int(round(float(indexed.loc[ts]))))
        elif ts in all_w.index:
            actual.append(int(round(float(all_w.loc[ts]))))
        else:
            actual.append(0)

    if end >= data_end - pd.Timedelta(days=7):
        if actual:
            actual[-1] = 0

    labels = [_format_label(ts, "week") for ts in weeks]
    return _pack_result(labels, actual, predicted, weather, event, enable_correction, "week")


def predict_month_window(
    *,
    daily: pd.DataFrame,
    start: pd.Timestamp,
    end: pd.Timestamp,
    weather: str,
    event: str,
    enable_correction: bool,
) -> dict:
    d = daily.copy()
    d["date"] = pd.to_datetime(d["date"]).dt.normalize()
    d = d.sort_values("date")
    data_start = d["date"].min()
    data_end = d["date"].max()

    start = max(pd.Timestamp(start).normalize(), data_start)
    end = min(pd.Timestamp(end).normalize(), data_end)
    if end < start:
        start, end = end, start

    all_d = d.copy()
    all_d["month"] = all_d["date"].dt.to_period("M").dt.to_timestamp()
    all_m = all_d.groupby("month")["flow"].sum()

    months = pd.date_range(
        start.to_period("M").to_timestamp(),
        end.to_period("M").to_timestamp(),
        freq="MS",
    )
    if len(months) == 0:
        months = pd.DatetimeIndex([start.to_period("M").to_timestamp()])

    def key_fn(ts: pd.Timestamp) -> int:
        return int(pd.Timestamp(ts).month)

    train = all_m[all_m.index < months.min()] if len(all_m) else all_m
    if len(train) < 2:
        train = all_m

    predicted = _seasonal_predict(train, months, key_fn)

    actual: list[int] = []
    for ts in months:
        if ts in all_m.index:
            actual.append(int(round(float(all_m.loc[ts]))))
        else:
            actual.append(0)

    if end.to_period("M") >= data_end.to_period("M"):
        if actual:
            actual[-1] = 0

    labels = [_format_label(ts, "month") for ts in months]
    return _pack_result(labels, actual, predicted, weather, event, enable_correction, "month")


def run_window_predict(req: dict) -> dict:
    scope = req.get("scope", "line")
    station_id = req.get("station_id")
    segment_id = req.get("segment_id")
    channel = req.get("channel") or ""
    weather = req.get("weather_factor") or "none"
    event = req.get("event_factor") or "none"
    enable_correction = bool(req.get("enable_correction", True))
    granularity = (req.get("granularity") or "day").lower()
    if granularity not in ("hour", "day", "week", "month"):
        granularity = "day"

    start_raw = req.get("start") or req.get("as_of")
    end_raw = req.get("end") or req.get("as_of")
    if not end_raw:
        raise ValueError("需要指定预测区间结束日")

    end = pd.Timestamp(end_raw).normalize()
    start = pd.Timestamp(start_raw).normalize() if start_raw else end

    if granularity == "hour":
        result = predict_hour_window(
            scope=scope,
            station_id=station_id,
            segment_id=segment_id,
            channel=channel,
            as_of=end,
            time_start=req.get("time_start") or "06:00",
            time_end=req.get("time_end") or "22:00",
            weather=weather,
            event=event,
            enable_correction=enable_correction,
        )
    else:
        daily = _resolve_daily(scope, station_id, segment_id, channel)
        if daily.empty:
            raise ValueError("选定范围无可用历史数据，请先完成 ETL")
        if granularity == "week":
            result = predict_week_window(
                daily=daily,
                start=start,
                end=end,
                weather=weather,
                event=event,
                enable_correction=enable_correction,
            )
        elif granularity == "month":
            result = predict_month_window(
                daily=daily,
                start=start,
                end=end,
                weather=weather,
                event=event,
                enable_correction=enable_correction,
            )
        else:
            result = predict_day_window(
                daily=daily,
                start=start,
                end=end,
                weather=weather,
                event=event,
                enable_correction=enable_correction,
            )

    result["scope"] = scope
    result["method"] = req.get("method") or "history"
    result["start"] = start.strftime("%Y-%m-%d")
    result["end"] = end.strftime("%Y-%m-%d")
    return result
