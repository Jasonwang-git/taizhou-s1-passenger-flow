"""训练站点 / 全线模型。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from etl.paths import ARTIFACTS_DIR, METRICS_PATH, ensure_dirs
from etl.station_map import STATIONS
from models.features import daily_line_flow, daily_station_flow, load_station_hourly
from models.lstm_model import train_lstm
from models.service import LINE_LSTM, LINE_XGB, STATION_LSTM_TMPL, STATION_XGB_TMPL
from models.xgboost_model import train_xgb


def main():
    ensure_dirs()
    hourly = load_station_hourly()
    metrics: dict = {"models": []}

    print("train line xgb/lstm…")
    line_daily = daily_line_flow(hourly)
    mx = train_xgb(line_daily, LINE_XGB)
    metrics["models"].append({"method": "xgboost", "scope": "line", **mx})
    try:
        ml = train_lstm(line_daily, LINE_LSTM, epochs=30)
        metrics["models"].append({"method": "lstm", "scope": "line", **ml})
    except Exception as e:
        print(f"line lstm skip: {e}")

    for s in STATIONS:
        sid = str(s["ui_id"])
        daily = daily_station_flow(hourly, station_id=sid)
        print(f"train station {sid}…")
        try:
            mx = train_xgb(daily, STATION_XGB_TMPL.format(sid=sid))
            metrics["models"].append({"method": "xgboost", "scope": "station", "station_id": sid, **mx})
        except Exception as e:
            print(f"  xgb skip: {e}")
        try:
            ml = train_lstm(daily, STATION_LSTM_TMPL.format(sid=sid), epochs=25)
            metrics["models"].append({"method": "lstm", "scope": "station", "station_id": sid, **ml})
        except Exception as e:
            print(f"  lstm skip: {e}")

    METRICS_PATH.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {METRICS_PATH}")


if __name__ == "__main__":
    main()
