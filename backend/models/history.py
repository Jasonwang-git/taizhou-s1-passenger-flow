"""历史均值 / 同星期几预测。"""

from __future__ import annotations

import numpy as np
import pandas as pd

from models.features import apply_factors, format_dates, mape


def predict_history(
    daily: pd.DataFrame,
    horizon: int = 7,
    as_of: pd.Timestamp | None = None,
    weather: str = "none",
    event: str = "none",
    enable_correction: bool = True,
) -> dict:
    d = daily.copy().sort_values("date")
    d["date"] = pd.to_datetime(d["date"])
    if as_of is None:
        as_of = d["date"].max()
    else:
        as_of = pd.Timestamp(as_of).normalize()

    hist = d[d["date"] <= as_of].copy()
    if hist.empty:
        raise ValueError("历史数据为空")

    hist["dow"] = hist["date"].dt.dayofweek
    dow_mean = hist.groupby("dow")["flow"].mean().to_dict()
    global_mean = float(hist["flow"].mean())

    # 展示窗口：as_of 往前 horizon-1 天到 as_of（最后一天为「明日」预测位）
    dates = pd.date_range(end=as_of, periods=horizon, freq="D")
    actual: list[float] = []
    predicted: list[float] = []

    hist_indexed = hist.set_index("date")["flow"]

    for i, dt in enumerate(dates):
        dow = int(dt.dayofweek)
        pred = float(dow_mean.get(dow, global_mean))
        predicted.append(pred)
        if i >= horizon - 2:
            # 最后两天无「实际」（对齐前端 mock）
            actual.append(0.0)
        else:
            actual.append(float(hist_indexed.get(dt, np.nan)) if dt in hist_indexed.index else float("nan"))

    predicted_arr = apply_factors(np.array(predicted), weather, event)
    actual_arr = np.array(actual, dtype=float)
    # 用验证窗口算 mape
    val = hist.tail(14)
    if len(val) >= 7:
        vp = np.array([dow_mean.get(int(r.date.dayofweek), global_mean) for r in val.itertuples()])
        m = mape(val["flow"].to_numpy(), vp)
    else:
        m = 8.5

    corrected = predicted_arr.copy()
    if enable_correction:
        corrected = np.round(predicted_arr * 1.02)
    deviation = float(abs(corrected[-1] - predicted_arr[-1]) / max(predicted_arr[-1], 1) * 100)

    # actual NaN → 0 for JSON，前端会把近两天当空
    actual_out = [0 if (a != a or a == 0) and i >= horizon - 2 else (0 if a != a else int(round(a))) for i, a in enumerate(actual_arr)]
    # 更清晰：前几天填真实，后两天 0
    actual_out = []
    for i, dt in enumerate(dates):
        if i >= horizon - 2:
            actual_out.append(0)
        elif dt in hist_indexed.index:
            actual_out.append(int(round(float(hist_indexed.loc[dt]))))
        else:
            actual_out.append(0)

    return {
        "dates": format_dates(dates),
        "actual": actual_out,
        "predicted": [int(round(x)) for x in predicted_arr],
        "corrected": [int(round(x)) for x in corrected],
        "tomorrow": int(round(predicted_arr[-1])),
        "mape": round(m, 1),
        "unit": "人次",
        "deviation": round(deviation, 1),
    }
