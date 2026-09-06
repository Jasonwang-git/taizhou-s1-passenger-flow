from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Scope = Literal["line", "station", "section"]
Method = Literal["lstm", "arima", "prophet", "xgboost", "history"]
Granularity = Literal["hour", "day", "week", "month"]


class PredictRequest(BaseModel):
    scope: Scope = "line"
    method: Method = "history"
    station_id: str | None = None
    segment_id: str | None = None
    horizon_days: int = Field(default=7, ge=3, le=90)
    as_of: str | None = None
    start: str | None = None
    end: str | None = None
    granularity: Granularity = "day"
    time_start: str | None = "06:00"
    time_end: str | None = "22:00"
    weather_factor: str = "none"
    event_factor: str = "none"
    enable_correction: bool = True
    channel: str = ""


class PredictResponse(BaseModel):
    dates: list[str]
    actual: list[int]
    predicted: list[int]
    corrected: list[int]
    tomorrow: int
    mape: float
    unit: str = "人次"
    deviation: float = 0.0
    scope: str | None = None
    method: str | None = None
    granularity: str | None = None
    start: str | None = None
    end: str | None = None
