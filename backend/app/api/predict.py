from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import PredictRequest, PredictResponse
from models.service import list_models, load_metrics, run_predict, data_date_range

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/models")
def models():
    return list_models()


@router.get("/metrics")
def metrics():
    return load_metrics()


@router.get("/data-range")
def data_range():
    return data_date_range()


@router.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    try:
        result = run_predict(body.model_dump())
        return PredictResponse(**result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"预测失败: {e}") from e
