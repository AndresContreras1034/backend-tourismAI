import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import recommendations

app = FastAPI(
    title="AI Recommendation Service",
    description="Recomendador local entrenado con calificaciones de turismo en Bogotá",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://frontend-tourism-ai.vercel.app",
        *[
            origin.strip()
            for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
            if origin.strip()
        ],
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(recommendations.router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "ai-service",
        "message": "AI Recommendation Service running",
        "dataset_rows": recommendations.engine.dataset_rows,
    }