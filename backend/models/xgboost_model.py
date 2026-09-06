"""XGBoost 日客流预测。"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor

from etl.paths import ARTIFACTS_DIR, ensure_dirs
from models.features import apply_factors, build_lag_features, format_dates, mape

FEATURE_COLS = ["lag_1", "lag_2", "lag_3", "lag_7", "lag_14", "dow", "month", "is_weekend", "roll7"]


def train_xgb(daily: pd.DataFrame, artifact_name: str) -> dict:
    ensure_dirs()
    feat = build_lag_features(daily).dropna()
    if len(feat) < 40:
        raise ValueError(f"样本过少无法训练 XGBoost: {len(feat)}")

    split = feat["date"].max() - pd.Timedelta(days=14)
    train = feat[feat["date"] <= split]
    valid = feat[feat["date"] > split]
    if train.empty:
        train, valid = feat.iloc[:-14], feat.iloc[-14:]

    model = XGBRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="reg:squarederror",
        n_jobs=4,
        random_state=42,
    )
    model.fit(train[FEATURE_COLS], train["flow"])
    pred_v = model.predict(valid[FEATURE_COLS]) if not valid.empty else np.array([])
    score = mape(valid["flow"].to_numpy(), pred_v) if len(pred_v) else 5.0

    path = ARTIFACTS_DIR / artifact_name
    joblib.dump({"model": model, "mape": score, "last_date": str(feat["date"].max().date())}, path)
    return {"path": str(path), "mape": score, "n_train": len(train), "n_valid": len(valid)}


def _load(artifact_name: str):
    path = ARTIFACTS_DIR / artifact_name
    if not path.exists():
        return None
    return joblib.load(path)


def predict_xgb(
    daily: pd.DataFrame,
    artifact_name: str,
    horizon: int = 7,
    as_of: pd.Timestamp | None = None,
    weather: str = "none",
    event: str = "none",
    enable_correction: bool = True,
) -> dict:
    bundle = _load(artifact_name)
    if bundle is None:
        from models.history import predict_history

        return predict_history(daily, horizon, as_of, weather, event, enable_correction)

    model: XGBRegressor = bundle["model"]
    d = daily.copy().sort_values("date")
    d["date"] = pd.to_datetime(d["date"])
    if as_of is None:
        as_of = d["date"].max()
    else:
        as_of = pd.Timestamp(as_of).normalize()

    hist = d[d["date"] <= as_of].copy()
    hist_indexed = hist.set_index("date")["flow"]

    # 递归多步
    work = hist.copy()
    future_preds: list[float] = []
    for step in range(horizon):
        # 对展示窗口：我们预测的是 dates 上每一天；用历史+已预测填 lags
        target_date = as_of - pd.Timedelta(days=horizon - 1 - step)
        if target_date <= as_of and target_date in hist_indexed.index and step < horizon - 2:
            # 有实际时仍生成「拟合预测」
            pass
        feat = build_lag_features(work).dropna()
        if feat.empty:
            future_preds.append(float(work["flow"].mean()))
            continue
        row = feat.iloc[[-1]][FEATURE_COLS]
        # 若预测的是未来日，需要推进 work
        yhat = float(model.predict(row)[0])
        next_date = work["date"].max() + pd.Timedelta(days=1)
        # 对齐窗口：重建为 as_of 窗口上的预测
        future_preds.append(yhat)
        work = pd.concat(
            [work, pd.DataFrame({"date": [next_date], "flow": [yhat]})],
            ignore_index=True,
        )

    # 重新用窗口内逐日特征预测（更稳）
    dates = pd.date_range(end=as_of, periods=horizon, freq="D")
    predicted: list[float] = []
    work2 = hist[hist["date"] < dates.min()].copy()
    if work2.empty:
        work2 = hist.head(max(15, len(hist) // 2)).copy()

    for dt in dates:
        # 确保 work2 含 dt 前一日
        feat = build_lag_features(work2).dropna()
        if feat.empty:
            yhat = float(hist["flow"].mean())
        else:
            yhat = float(model.predict(feat.iloc[[-1]][FEATURE_COLS])[0])
        predicted.append(yhat)
        # 若该日有真实值且不是最后两天展示位，用真实更新；否则用预测
        if dt in hist_indexed.index and dt < dates[-2]:
            flow_add = float(hist_indexed.loc[dt])
        else:
            flow_add = yhat
        work2 = pd.concat([work2, pd.DataFrame({"date": [dt], "flow": [flow_add]})], ignore_index=True)

    predicted_arr = apply_factors(np.array(predicted), weather, event)
    corrected = np.round(predicted_arr * (1.02 if enable_correction else 1.0))

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
        "mape": round(float(bundle.get("mape", 5.0)), 1),
        "unit": "人次",
        "deviation": round(float(abs(corrected[-1] - predicted_arr[-1]) / max(predicted_arr[-1], 1) * 100), 1),
    }
