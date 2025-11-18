# -*- coding: utf-8 -*-
"""
Hit Model: Convert tuning errors to tonefield coordinates

Input: (tonic, octave, fifth) - tuning error values (cents)
Output: (L, S, strength) - tonefield coordinates (L, S) and hit strength
"""

from typing import Tuple
from abc import ABC, abstractmethod
import numpy as np


class BaseHitModel(ABC):
    """
    Abstract base class for Hit Models
    Provides interface for easy algorithm swapping
    """

    @abstractmethod
    def predict(self, tonic: float, octave: float, fifth: float) -> Tuple[float, float, float]:
        """
        Convert tuning errors to tonefield coordinates and hit strength

        Args:
            tonic: Tonic tuning error (cents)
            octave: Octave tuning error (cents)
            fifth: Fifth tuning error (cents)

        Returns:
            Tuple[L, S, strength]:
                - L: Long dimension coordinate
                - S: Short dimension coordinate
                - strength: Hit strength (0.0 ~ 1.0)
        """
        pass

    @abstractmethod
    def get_model_info(self) -> dict:
        """Return model information"""
        pass


class DummyHitModel(BaseHitModel):
    """
    Dummy model: Simple linear transformation for testing
    Placeholder until actual model is developed
    """

    def __init__(self):
        self.model_name = "Dummy Linear Model"
        self.version = "0.1.0"

    def predict(self, tonic: float, octave: float, fifth: float) -> Tuple[float, float, float]:
        """
        Simple linear transformation (dummy logic)
        Actual physical relationship will be much more complex

        Current logic (temporary):
        - L = tonic * 0.1 + octave * 0.05
        - S = fifth * 0.1 - octave * 0.03
        - strength = min(1.0, abs(tonic + octave + fifth) / 100.0)
        """
        L = tonic * 0.1 + octave * 0.05
        S = fifth * 0.1 - octave * 0.03

        # Hit strength proportional to total error (normalized 0~1)
        total_error = abs(tonic) + abs(octave) + abs(fifth)
        strength = min(1.0, total_error / 100.0)

        return L, S, strength

    def get_model_info(self) -> dict:
        return {
            "name": self.model_name,
            "version": self.version,
            "description": "Simple linear transformation for testing",
            "formula": {
                "L": "tonic * 0.1 + octave * 0.05",
                "S": "fifth * 0.1 - octave * 0.03",
                "strength": "min(1.0, abs(tonic + octave + fifth) / 100.0)"
            }
        }


class PhysicsBasedHitModel(BaseHitModel):
    """
    Physics-based model (future implementation placeholder)
    Model reflecting physical characteristics of piano strings
    """

    def __init__(self):
        self.model_name = "Physics-Based Model"
        self.version = "0.0.1"

    def predict(self, tonic: float, octave: float, fifth: float) -> Tuple[float, float, float]:
        raise NotImplementedError("Physics-based model not yet implemented")

    def get_model_info(self) -> dict:
        return {
            "name": self.model_name,
            "version": self.version,
            "description": "Physics-based model (not yet implemented)",
            "status": "placeholder"
        }


class MLBasedHitModel(BaseHitModel):
    """
    ML-based model (future implementation placeholder)
    Model trained from experimental data
    """

    def __init__(self):
        self.model_name = "ML-Based Model"
        self.version = "0.0.1"

    def predict(self, tonic: float, octave: float, fifth: float) -> Tuple[float, float, float]:
        raise NotImplementedError("ML-based model not yet implemented")

    def get_model_info(self) -> dict:
        return {
            "name": self.model_name,
            "version": self.version,
            "description": "Machine learning based model (not yet implemented)",
            "status": "placeholder"
        }


def get_active_model() -> BaseHitModel:
    """
    Return current active model
    Can be extended to select from config or environment variable
    """
    return DummyHitModel()


if __name__ == "__main__":
    model = get_active_model()
    print(f"Active Model: {model.get_model_info()['name']}")

    tonic, octave, fifth = 5.0, -2.0, 3.0
    L, S, strength = model.predict(tonic, octave, fifth)

    print(f"\nInput: tonic={tonic}, octave={octave}, fifth={fifth}")
    print(f"Output: L={L:.2f}, S={S:.2f}, strength={strength:.2f}")
