"""数据中心：真实交易明细预览。"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, Query

from etl.paths import REPO_ROOT

router = APIRouter(prefix="/api")

BACKEND_JSON = Path(__file__).resolve().parent.parent.parent / "data" / "json" / "acc_trips.json"
PUBLIC_JSON = REPO_ROOT / "public" / "data" / "acc-trips.json"


def _load_payload() -> dict:
    for path in (BACKEND_JSON, PUBLIC_JSON):
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    raise FileNotFoundError(
        "未找到 acc_trips 预览数据，请先运行: python -m etl.export_acc_preview"
    )


@router.get("/acc-records")
def acc_records(
    channel: str = Query(default="", description="acc | internet | 空=全部"),
    limit: int = Query(default=5000, ge=1, le=20000),
    offset: int = Query(default=0, ge=0),
):
    try:
        payload = _load_payload()
    except FileNotFoundError as e:
        from fastapi import HTTPException

        raise HTTPException(status_code=503, detail=str(e)) from e

    records = payload.get("records") or []
    ch = (channel or "").strip().lower()
    if ch in ("acc", "internet"):
        records = [r for r in records if str(r.get("channel") or "").lower() == ch]
    elif ch in ("互联网", "net"):
        records = [r for r in records if r.get("ticketName") == "互联网"]

    total = len(records)
    page = records[offset : offset + limit]
    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "source": payload.get("source"),
        "note": payload.get("note"),
        "accCount": payload.get("accCount"),
        "internetCount": payload.get("internetCount"),
        "records": page,
    }
