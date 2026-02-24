# Context Aware Monitoring Component

## Overview
This component provides context-aware monitoring for CTB bus safety systems. It uses computer vision and deep learning to detect potential hazards and provide real-time warnings.

## Features
- **Lane Detection**: YOLOv8 segmentation model for detecting road lanes
- **Lane Departure Warning**: Audio alerts when approaching solid lanes on the right
- **Object Detection**: Detect vehicles and other road objects
- **Depth Estimation**: MiDaS ONNX model for distance measurement
- **Proximity Analysis**: Determine if objects are close, medium, or far
- **CTB Health Monitoring**: Integration with central monitoring system

## Folder Structure
```
context_aware_monitoring/
├── __init__.py                      # Package initialization
├── main.py                          # Main lane detection with depth estimation
├── object_distance_measurement.py   # Object detection with distance measurement
├── video_infer.py                   # Video inference utility
├── convert_midas_to_onnx.py         # MiDaS model converter
├── DEPTH_SETUP.md                   # Depth estimation setup guide
├── README.md                        # This file
├── models/                          # ML models
│   ├── bestV8.pt                    # YOLOv8 lane detection model
│   ├── roadObjectDetectionYoloV8.pt # Road object detection model
│   ├── model-small.onnx             # MiDaS depth estimation model
│   └── old_models/                  # Legacy models
└── assets/                          # Audio and other assets
    └── microwave-oven-beeps-36087.mp3  # Warning sound
```

## Usage

### Lane Detection with Depth Estimation
```bash
cd device/context_aware_monitoring
python main.py
```

### Object Detection with Distance Measurement
```bash
cd device/context_aware_monitoring
python object_distance_measurement.py
```

### Video Inference
```bash
cd device/context_aware_monitoring
python video_infer.py --model models/bestV8.pt --input video.mp4 --show
```

## Requirements
```
ultralytics>=8.0.0
opencv-python>=4.5.0
numpy>=1.21.0
onnxruntime>=1.10.0
pygame>=2.0.0
paho-mqtt>=1.6.0
psutil>=5.8.0
```

## Models
| Model | Purpose | Format |
|-------|---------|--------|
| bestV8.pt | Lane detection (YOLOv8 segmentation) | PyTorch |
| roadObjectDetectionYoloV8.pt | Road object detection | PyTorch |
| model-small.onnx | MiDaS depth estimation | ONNX |

## Integration with CTB System
This component integrates with the CTB bus monitoring system via MQTT:
- Sends health status updates
- Reports lane departure violations
- Sends proximity warnings for detected objects

## Author
[Your Name] - Context Aware Monitoring Component
