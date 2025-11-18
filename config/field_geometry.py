# -*- coding: utf-8 -*-
"""
Field Geometry Configuration: Tonefield coordinate system settings

Define and manage tonefield geometry for each note
"""

from typing import Dict, Tuple
from dataclasses import dataclass
import json


@dataclass
class EllipseParams:
    """Ellipse parameters"""
    center_x: float
    center_y: float
    semi_major: float
    semi_minor: float
    rotation: float


@dataclass
class TonefieldGeometry:
    """Tonefield coordinate system geometry"""
    field_size: float
    ellipse: EllipseParams
    scale_factor: float = 1.0

    def to_dict(self) -> dict:
        return {
            'field_size': self.field_size,
            'ellipse': {
                'center_x': self.ellipse.center_x,
                'center_y': self.ellipse.center_y,
                'semi_major': self.ellipse.semi_major,
                'semi_minor': self.ellipse.semi_minor,
                'rotation': self.ellipse.rotation
            },
            'scale_factor': self.scale_factor
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'TonefieldGeometry':
        ellipse = EllipseParams(**data['ellipse'])
        return cls(
            field_size=data['field_size'],
            ellipse=ellipse,
            scale_factor=data.get('scale_factor', 1.0)
        )


class GeometryConfig:
    """Tonefield geometry configuration manager"""

    def __init__(self):
        self._default_geometry = TonefieldGeometry(
            field_size=100.0,
            ellipse=EllipseParams(
                center_x=0.0,
                center_y=0.0,
                semi_major=40.0,
                semi_minor=30.0,
                rotation=0.0
            ),
            scale_factor=1.0
        )
        self._geometries: Dict[str, TonefieldGeometry] = {}

    def get_geometry(self, note_name: str = 'default') -> TonefieldGeometry:
        if note_name == 'default' or note_name not in self._geometries:
            return self._default_geometry
        return self._geometries[note_name]

    def set_geometry(self, note_name: str, geometry: TonefieldGeometry):
        self._geometries[note_name] = geometry


_config = GeometryConfig()


def get_geometry_config() -> GeometryConfig:
    return _config


def get_default_geometry() -> TonefieldGeometry:
    return _config.get_geometry('default')
