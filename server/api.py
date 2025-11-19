# -*- coding: utf-8 -*-
"""
Tuning Lab API: FastAPI-based REST API server

API for converting tuning errors to tonefield coordinates
For integration with Flutter app or external clients
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from models.hit_model import get_active_model


app = FastAPI(
    title="Tuning Lab API",
    description="Piano tuning error to tonefield coordinate conversion API",
    version="0.1.0"
)

# CORS settings for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TuningErrorInput(BaseModel):
    """Tuning error input model"""
    tonic: float = Field(..., description="Tonic tuning error (cents)", ge=-50.0, le=50.0)
    octave: float = Field(..., description="Octave tuning error (cents)", ge=-50.0, le=50.0)
    fifth: float = Field(..., description="Fifth tuning error (cents)", ge=-50.0, le=50.0)
    note_name: Optional[str] = Field(None, description="Note name (e.g., 'A4', 'C3')")

    class Config:
        json_schema_extra = {
            "example": {
                "tonic": 5.0,
                "octave": -2.0,
                "fifth": 3.0,
                "note_name": "A4"
            }
        }


class HitPointOutput(BaseModel):
    """Hit point coordinate output model"""
    L: float = Field(..., description="Long dimension coordinate")
    S: float = Field(..., description="Short dimension coordinate")
    strength: float = Field(..., description="Hit strength (0.0 ~ 1.0)")
    model_name: str = Field(..., description="Model name used for prediction")


class ModelInfoOutput(BaseModel):
    """Model information output model"""
    name: str
    version: str
    description: str


@app.get("/")
async def root():
    return {
        "message": "Welcome to Tuning Lab API",
        "version": "0.1.0",
        "endpoints": {
            "predict": "/predict",
            "model_info": "/model/info",
            "docs": "/docs"
        }
    }


@app.post("/predict", response_model=HitPointOutput)
async def predict_hit_point(input_data: TuningErrorInput):
    """Predict hit point from tuning errors"""
    try:
        model = get_active_model()
        L, S, strength = model.predict(
            tonic=input_data.tonic,
            octave=input_data.octave,
            fifth=input_data.fifth
        )
        return HitPointOutput(
            L=L,
            S=S,
            strength=strength,
            model_name=model.get_model_info()['name']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/model/info", response_model=ModelInfoOutput)
async def get_model_info():
    """Get current active model information"""
    try:
        model = get_active_model()
        info = model.get_model_info()
        return ModelInfoOutput(
            name=info['name'],
            version=info['version'],
            description=info['description']
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tuning-lab-api"}


if __name__ == "__main__":
    import uvicorn
    print("Starting Tuning Lab API server...")
    print("API docs available at: http://localhost:8000/docs")
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
