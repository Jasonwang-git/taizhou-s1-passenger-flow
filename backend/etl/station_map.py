"""站点 ID 映射：交易系统 0121–0135 ↔ 前端 1–15。"""

from __future__ import annotations

# 北→南顺序，与前端 STATIONS 一致
STATIONS: list[dict[str, str | int]] = [
    {"order": 1, "ui_id": "1", "acc_id": "0121", "name": "台州火车站"},
    {"order": 2, "ui_id": "2", "acc_id": "0122", "name": "学院路站"},
    {"order": 3, "ui_id": "3", "acc_id": "0123", "name": "国博中心站"},
    {"order": 4, "ui_id": "4", "acc_id": "0124", "name": "汇丰路站"},
    {"order": 5, "ui_id": "5", "acc_id": "0125", "name": "锦泰站"},
    {"order": 6, "ui_id": "6", "acc_id": "0126", "name": "恩泽医院站"},
    {"order": 7, "ui_id": "7", "acc_id": "0127", "name": "台州汽车南站"},
    {"order": 8, "ui_id": "8", "acc_id": "0128", "name": "泽国站"},
    {"order": 9, "ui_id": "9", "acc_id": "0129", "name": "温岭火车站"},
    {"order": 10, "ui_id": "10", "acc_id": "0130", "name": "汇川王站"},
    {"order": 11, "ui_id": "11", "acc_id": "0131", "name": "温岭第一人民医院站"},
    {"order": 12, "ui_id": "12", "acc_id": "0132", "name": "九龙大道站"},
    {"order": 13, "ui_id": "13", "acc_id": "0133", "name": "万昌路站"},
    {"order": 14, "ui_id": "14", "acc_id": "0134", "name": "南屏站"},
    {"order": 15, "ui_id": "15", "acc_id": "0135", "name": "城南站"},
]

ACC_TO_UI = {str(s["acc_id"]): str(s["ui_id"]) for s in STATIONS}
UI_TO_ACC = {str(s["ui_id"]): str(s["acc_id"]) for s in STATIONS}
ACC_TO_ORDER = {str(s["acc_id"]): int(s["order"]) for s in STATIONS}
UI_TO_ORDER = {str(s["ui_id"]): int(s["order"]) for s in STATIONS}
UI_TO_NAME = {str(s["ui_id"]): str(s["name"]) for s in STATIONS}

# 相邻断面（北→南），id 与前端 LINE_SEGMENTS 一致
SEGMENTS: list[dict[str, str]] = []
for i in range(len(STATIONS) - 1):
    a, b = STATIONS[i], STATIONS[i + 1]
    SEGMENTS.append(
        {
            "id": f"{a['ui_id']}-{b['ui_id']}",
            "from_ui": str(a["ui_id"]),
            "to_ui": str(b["ui_id"]),
            "from_acc": str(a["acc_id"]),
            "to_acc": str(b["acc_id"]),
            "label": f"{a['name']} → {b['name']}",
        }
    )

SEGMENT_BY_ID = {s["id"]: s for s in SEGMENTS}


def normalize_acc_id(raw: object) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    if s.isdigit():
        s = s.zfill(4)
    return s if s in ACC_TO_UI else None


def sheet_to_station_dir(sheet_name: str) -> tuple[str, str] | None:
    """'121in' → ('1', 'in'); '135out' → ('15', 'out')."""
    name = sheet_name.strip().lower()
    if name.endswith("in"):
        code, direction = name[:-2], "in"
    elif name.endswith("out"):
        code, direction = name[:-3], "out"
    else:
        return None
    acc = code.zfill(4) if code.isdigit() else code
    if len(acc) == 3:
        acc = "0" + acc
    ui = ACC_TO_UI.get(acc)
    if not ui:
        return None
    return ui, direction
