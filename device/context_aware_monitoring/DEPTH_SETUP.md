# MiDaS Depth Estimation Setup

## Overview
The system now runs lane detection and depth estimation simultaneously with split-screen output:
- **Left side**: Lane detection with ADAS warnings
- **Right side**: MiDaS depth map

## Requirements

### 1. Install Dependencies
```powershell
pip install -r requirements.txt
```

This installs:
- `ultralytics` - YOLOv8 for lane segmentation
- `opencv-python` - Video processing
- `numpy` - Array operations
- `pygame` - Audio warnings
- `onnxruntime` - MiDaS depth estimation

### 2. Download MiDaS ONNX Model

Download one of these MiDaS models (converted to ONNX format):

**Option A: Use pre-converted ONNX model**
1. Visit: https://github.com/isl-org/MiDaS/releases
2. Download `model-small.onnx` or convert PyTorch model to ONNX

**Option B: Convert PyTorch model to ONNX yourself**
```python
import torch
import onnx

# Load MiDaS model
model = torch.hub.load("intel-isl/MiDaS", "MiDaS_small")
model.eval()

# Create dummy input
dummy_input = torch.randn(1, 3, 256, 256)

# Export to ONNX
torch.onnx.export(
    model,
    dummy_input,
    "model-small.onnx",
    export_params=True,
    opset_version=11,
    do_constant_folding=True,
    input_names=['input'],
    output_names=['output']
)
```

**Option C: Download from alternative sources**
- Check: https://github.com/PINTO0309/PINTO_model_zoo (search for MiDaS)
- Hugging Face model repos

### 3. Place Model File
Put `model-small.onnx` in the same directory as `main.py`:
```
myRoadLaneyoloV8Seg/
├── main.py
├── bestV8.pt
├── model-small.onnx  ← MiDaS depth model
├── microwave-oven-beeps-36087.mp3
└── requirements.txt
```

## Usage

### Run the System
```powershell
python main.py
```

### Interactive Prompts
1. **YOLO Model**: Enter path to lane detection model (default: `bestV8.pt`)
2. **MiDaS Model**: Enter path to depth model (default: `model-small.onnx`)
3. **Video Input**: Enter path to video file or `0` for webcam
4. **Show Preview**: Enter `y` to see live split-screen preview

### Output
- **Video file**: `output_annotated.mp4` (split-screen: lane + depth)
- **Live preview**: Window showing both views side-by-side
- **Console**: Warning messages when approaching solid lanes

## Features

### Lane Detection (Left Side)
- Segmentation masks for all detected lanes
- Main driving lane highlighted in blue-cyan
- Fixed green dot showing vehicle position (turns red on warning)
- Distance measurements to right-side solid lanes
- Audio warnings for lane departure

### Depth Estimation (Right Side)
- Color-coded depth map (MAGMA colormap)
- Close objects: Yellow/White
- Far objects: Dark blue/Purple
- Real-time depth analysis at ~256x256 resolution

## Troubleshooting

### "MiDaS model not found"
- Download `model-small.onnx` as described above
- Check file path and name
- Ensure file is in the correct directory

### "ONNX Runtime not available"
```powershell
pip install onnxruntime
```

### Slow Performance
- MiDaS model runs on CPU by default
- For GPU acceleration:
  ```powershell
  pip uninstall onnxruntime
  pip install onnxruntime-gpu
  ```
- Use smaller input size (edit line in main.py):
  ```python
  depth_estimator = MiDaSDepth(model_path=midas_model_path, input_size=(128, 128))
  ```

### Black Screen on Depth Side
- Model may not be compatible
- Try different ONNX opset version
- Check console for error messages

## Model Information

### MiDaS Models
| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| MiDaS_small | ~20MB | Fast | Good |
| MiDaS | ~100MB | Medium | Better |
| MiDaS v2.1 | ~100MB | Medium | Best |

### Recommended
For real-time processing: **MiDaS_small** (256x256 input)

## Advanced Configuration

### Adjust Depth Input Size
Edit in `main.py`:
```python
depth_estimator = MiDaSDepth(
    model_path=midas_model_path, 
    input_size=(384, 384)  # Higher = better quality, slower
)
```

### Change Depth Colormap
Edit in `MiDaSDepth.estimate_depth()`:
```python
depth_colored = cv2.applyColorMap(depth_uint8, cv2.COLORMAP_TURBO)
# Options: COLORMAP_JET, COLORMAP_VIRIDIS, COLORMAP_PLASMA, etc.
```

### Disable Depth (Lane Detection Only)
When prompted for MiDaS model path, press Enter with invalid/missing file, then select "Y" to continue without depth.

## Performance Tips
1. Lower video resolution for faster processing
2. Use smaller MiDaS input size (128x128 or 192x192)
3. Process every Nth frame for depth (add frame skip logic)
4. Use GPU with onnxruntime-gpu

## Support
For issues with:
- **Lane detection**: Check YOLO model and class IDs
- **Depth estimation**: Verify ONNX model compatibility
- **Audio warnings**: Ensure pygame and audio file present
