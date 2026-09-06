"""台州数据全站点.xlsx → hourly_station.parquet"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

# 允许 python -m etl.build_hourly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from etl.paths import FULL_STATION_XLSX, HOURLY_STATION_PATH, ensure_dirs
from etl.station_map import sheet_to_station_dir


YES_VALUES = {"是", "Y", "y", "1", 1, True, "true", "True"}


def _to_flag(v: object) -> int:
    if v in YES_VALUES:
        return 1
    if isinstance(v, str) and v.strip() in YES_VALUES:
        return 1
    return 0


def _rename_columns(df: pd.DataFrame) -> pd.DataFrame:
    # 兼容不同编码下的中文列名：按位置映射最后几列
    cols = list(df.columns)
    mapping: dict[str, str] = {}
    for c in cols:
        cl = str(c).lower()
        if cl == "date":
            mapping[c] = "datetime"
        elif "temperature_2m" in cl:
            mapping[c] = "temperature_2m"
        elif "relative_humidity" in cl:
            mapping[c] = "relative_humidity_2m"
        elif cl == "precipitation":
            mapping[c] = "precipitation"
        elif cl == "rain":
            mapping[c] = "rain"
        elif cl == "snowfall":
            mapping[c] = "snowfall"
        elif "snow_depth" in cl:
            mapping[c] = "snow_depth"
        elif "wind_speed" in cl:
            mapping[c] = "wind_speed_10m"
        elif "soil_temperature" in cl:
            mapping[c] = "soil_temperature_0_to_7cm"
        elif "工作日" in str(c):
            mapping[c] = "is_workday"
        elif "节假日" in str(c):
            mapping[c] = "is_holiday"
        elif "周六" in str(c) or "周末" in str(c):
            mapping[c] = "is_weekend"
        elif "客流" in str(c) or "小时" in str(c):
            mapping[c] = "flow"
    out = df.rename(columns=mapping)
    # 若中文列名乱码，用位置兜底：最后 4 列为 工作日/节假日/周末/客流
    if "flow" not in out.columns and len(out.columns) >= 13:
        rename_pos = {
            out.columns[-4]: "is_workday",
            out.columns[-3]: "is_holiday",
            out.columns[-2]: "is_weekend",
            out.columns[-1]: "flow",
        }
        out = out.rename(columns=rename_pos)
    if "datetime" not in out.columns:
        out = out.rename(columns={out.columns[0]: "datetime"})
    return out


def build() -> Path:
    ensure_dirs()
    if not FULL_STATION_XLSX.exists():
        raise FileNotFoundError(f"未找到数据文件: {FULL_STATION_XLSX}")

    xl = pd.ExcelFile(FULL_STATION_XLSX)
    frames: list[pd.DataFrame] = []
    for sheet in xl.sheet_names:
        parsed = sheet_to_station_dir(sheet)
        if not parsed:
            print(f"skip sheet: {sheet}")
            continue
        station_id, direction = parsed
        raw = pd.read_excel(xl, sheet_name=sheet)
        df = _rename_columns(raw)
        need = ["datetime", "flow"]
        for col in need:
            if col not in df.columns:
                raise ValueError(f"{sheet} 缺少列 {col}, columns={list(df.columns)}")
        out = pd.DataFrame(
            {
                "datetime": pd.to_datetime(df["datetime"]),
                "station_id": station_id,
                "direction": direction,
                "flow": pd.to_numeric(df["flow"], errors="coerce").fillna(0).astype("int32"),
            }
        )
        for col in [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation",
            "rain",
            "snowfall",
            "snow_depth",
            "wind_speed_10m",
            "soil_temperature_0_to_7cm",
        ]:
            if col in df.columns:
                out[col] = pd.to_numeric(df[col], errors="coerce")
        for col in ["is_workday", "is_holiday", "is_weekend"]:
            if col in df.columns:
                out[col] = df[col].map(_to_flag).astype("int8")
            else:
                out[col] = 0
        frames.append(out)
        print(f"loaded {sheet}: {len(out)} rows → station={station_id} {direction}")

    if not frames:
        raise RuntimeError("未读到任何有效 sheet")

    all_df = pd.concat(frames, ignore_index=True)
    all_df = all_df.sort_values(["station_id", "direction", "datetime"]).reset_index(drop=True)
    all_df.to_parquet(HOURLY_STATION_PATH, index=False)
    print(f"wrote {HOURLY_STATION_PATH} rows={len(all_df)}")
    return HOURLY_STATION_PATH


if __name__ == "__main__":
    build()
