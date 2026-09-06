from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.predict import router as predict_router
from app.api.acc_data import router as acc_router
from app.api.data_hub import router as hub_router

app = FastAPI(title="台州 S1 客流预测 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)
app.include_router(acc_router)
app.include_router(hub_router)


@app.get("/")
def root():
    return {"service": "taizhou-s1-passenger-flow", "docs": "/docs"}
