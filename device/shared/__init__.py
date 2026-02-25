"""
Shared resources for CTB Bus Violation Detection System.

Provides centralized config and lightweight ONNX YOLO inference
for all device components. Optimized for Raspberry Pi deployment.
"""

from .config import DeviceConfig
from .onnx_yolo import OnnxYOLO

__all__ = ['DeviceConfig', 'OnnxYOLO']
