"""训练断面模型。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from etl.paths import METRICS_PATH, ensure_dirs
from etl.station_map import SEGMENTS
from models.features import daily_section_flow, load_section_hourly
from models.lstm_model import train_lstm
from models.service import SECTION_LSTM_TMPL, SECTION_XGB_TMPL
from models.xgboost_model import train_xgb


def main():
    ensure_dirs()
    sec = load_section_hourly()
    metrics = {"models": []}
    if METRICS_PATH.exists():
        metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))

    for seg in SEGMENTS:
        sid = seg["id"]
        key = sid.replace("-", "_")
        daily = daily_section_flow(sid, df=sec)
        print(f"train section {sid} rows={len(daily)}…")
        if len(daily) < 40:
            print("  skip: too few days")
            continue
        try:
            mx = train_xgb(daily, SECTION_XGB_TMPL.format(seg=key))
            metrics["models"].append({"method": "xgboost", "scope": "section", "segment_id": sid, **mx})
        except Exception as e:
            print(f"  xgb skip: {e}")
        try:
            ml = train_lstm(daily, SECTION_LSTM_TMPL.format(seg=key), epochs=25)
            metrics["models"].append({"method": "lstm", "scope": "section", "segment_id": sid, **ml})
        except Exception as e:
            print(f"  lstm skip: {e}")

    METRICS_PATH.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {METRICS_PATH}")


if __name__ == "__main__":
    main()
