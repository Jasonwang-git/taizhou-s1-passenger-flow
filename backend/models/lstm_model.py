"""LSTM 日序列多步预测（CPU）。"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

from etl.paths import ARTIFACTS_DIR, ensure_dirs
from models.features import apply_factors, format_dates, mape

SEQ_LEN = 14


class FlowLSTM(nn.Module):
    def __init__(self, hidden: int = 32):
        super().__init__()
        self.lstm = nn.LSTM(input_size=1, hidden_size=hidden, batch_first=True)
        self.fc = nn.Linear(hidden, 1)

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])


def _make_sequences(values: np.ndarray, seq_len: int = SEQ_LEN):
    xs, ys = [], []
    for i in range(len(values) - seq_len):
        xs.append(values[i : i + seq_len])
        ys.append(values[i + seq_len])
    return np.array(xs, dtype=np.float32), np.array(ys, dtype=np.float32)


def train_lstm(daily: pd.DataFrame, artifact_name: str, epochs: int = 40) -> dict:
    ensure_dirs()
    d = daily.sort_values("date")
    values = d["flow"].to_numpy(dtype=np.float32)
    if len(values) < SEQ_LEN + 20:
        raise ValueError("样本过少无法训练 LSTM")

    mean, std = float(values.mean()), float(values.std() + 1e-6)
    norm = (values - mean) / std
    split = len(norm) - 14
    train_v, valid_v = norm[:split], norm[split:]

    x_tr, y_tr = _make_sequences(train_v)
    if len(x_tr) < 8:
        raise ValueError("训练序列过少")

    device = torch.device("cpu")
    model = FlowLSTM().to(device)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()
    loader = DataLoader(
        TensorDataset(torch.from_numpy(x_tr).unsqueeze(-1), torch.from_numpy(y_tr).unsqueeze(-1)),
        batch_size=32,
        shuffle=True,
    )

    model.train()
    for _ in range(epochs):
        for xb, yb in loader:
            xb, yb = xb.to(device), yb.to(device)
            opt.zero_grad()
            pred = model(xb)
            loss = loss_fn(pred, yb)
            loss.backward()
            opt.step()

    # valid mape
    model.eval()
    score = 6.0
    if len(valid_v) > 0:
        full = norm
        preds = []
        truths = []
        for i in range(split, len(full)):
            if i < SEQ_LEN:
                continue
            seq = full[i - SEQ_LEN : i]
            with torch.no_grad():
                p = model(torch.from_numpy(seq).view(1, SEQ_LEN, 1)).item()
            preds.append(p * std + mean)
            truths.append(values[i])
        if truths:
            score = mape(np.array(truths), np.array(preds))

    path = ARTIFACTS_DIR / artifact_name
    torch.save(
        {"state_dict": model.state_dict(), "mean": mean, "std": std, "mape": score},
        path,
    )
    return {"path": str(path), "mape": score}


def predict_lstm(
    daily: pd.DataFrame,
    artifact_name: str,
    horizon: int = 7,
    as_of: pd.Timestamp | None = None,
    weather: str = "none",
    event: str = "none",
    enable_correction: bool = True,
) -> dict:
    path = ARTIFACTS_DIR / artifact_name
    if not path.exists():
        from models.history import predict_history

        return predict_history(daily, horizon, as_of, weather, event, enable_correction)

    bundle = torch.load(path, map_location="cpu", weights_only=False)
    model = FlowLSTM()
    model.load_state_dict(bundle["state_dict"])
    model.eval()
    mean, std = float(bundle["mean"]), float(bundle["std"])

    d = daily.copy().sort_values("date")
    d["date"] = pd.to_datetime(d["date"])
    if as_of is None:
        as_of = d["date"].max()
    else:
        as_of = pd.Timestamp(as_of).normalize()
    hist = d[d["date"] <= as_of]
    hist_indexed = hist.set_index("date")["flow"]
    values = hist["flow"].to_numpy(dtype=np.float32)
    norm = list((values - mean) / std)

    dates = pd.date_range(end=as_of, periods=horizon, freq="D")
    # 从 as_of - horizon 开始逐步预测到 as_of
    # 使用 hist 到 dates.min()-1 的序列
    start = dates.min()
    base = hist[hist["date"] < start]["flow"].to_numpy(dtype=np.float32)
    if len(base) < SEQ_LEN:
        base = values[-SEQ_LEN:]
    seq = list((base - mean) / std)
    predicted: list[float] = []
    for i, dt in enumerate(dates):
        arr = np.array(seq[-SEQ_LEN:], dtype=np.float32)
        with torch.no_grad():
            yhat_n = model(torch.from_numpy(arr).view(1, SEQ_LEN, 1)).item()
        yhat = yhat_n * std + mean
        predicted.append(max(0.0, yhat))
        if dt in hist_indexed.index and i < horizon - 2:
            seq.append((float(hist_indexed.loc[dt]) - mean) / std)
        else:
            seq.append(yhat_n)

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
        "mape": round(float(bundle.get("mape", 6.0)), 1),
        "unit": "人次",
        "deviation": round(float(abs(corrected[-1] - predicted_arr[-1]) / max(predicted_arr[-1], 1) * 100), 1),
    }
