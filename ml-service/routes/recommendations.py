from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from engine.ranking_engine import engine, recomendar

router = APIRouter()


class UserFilters(BaseModel):
    tipo_viaje: list[
        Literal[
            "compras",
            "cultural",
            "gastronomia",
            "naturaleza",
            "relax",
            "vida_nocturna",
        ]
    ] = Field(default_factory=list, max_length=6)
    presupuesto: Literal["economico", "medio", "alto"]
    companions: Literal["solo", "pareja", "amigos", "familia"] | None = None
    top_n: int = Field(default=3, ge=1, le=10)


@router.get("/catalog")
def get_catalog():
    catalog = [
        {
            "name": str(row.plan_turistico_bogota),
            "rating_average": round(float(row.rating_average), 2),
            "rating_samples": int(row.rating_samples),
            "travel_types": list(row.travel_types),
        }
        for row in engine.plans.itertuples(index=False)
    ]
    return {
        "catalog": catalog,
        "summary": {
            "dataset_rows": engine.dataset_rows,
            "plan_count": len(catalog),
            "travel_types": engine.travel_types,
            "validation_mae": round(engine.validation_mae, 3),
        },
    }


@router.post("/recommendations")
def get_recommendations(filters: UserFilters):
    recommendations = recomendar(filters.model_dump(), top_n=filters.top_n)
    return {
        "bestMatch": recommendations[0] if recommendations else None,
        "recommendations": recommendations,
        "model": {
            "name": "RandomForestRegressor",
            "dataset_rows": engine.dataset_rows,
            "training_rows": engine.training_rows,
            "validation_mae": round(engine.validation_mae, 3),
        },
    }