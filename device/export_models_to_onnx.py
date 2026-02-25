#!/usr/bin/env python3
"""
Export all YOLOv8 .pt models to ONNX format.

Run this ONCE on a machine that has `ultralytics` installed (your
development laptop / PC).  The resulting .onnx files should be copied
to the Raspberry Pi where only `onnxruntime` is needed for inference.

Usage:
    python export_models_to_onnx.py          # export all models
    python export_models_to_onnx.py --check  # just list models found
"""

import argparse
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    print("ERROR: ultralytics is required for export.")
    print("Install: pip install ultralytics")
    exit(1)


DEVICE_DIR = Path(__file__).parent.absolute()

# Models to export – (path_relative_to_device_dir, export_imgsz)
MODELS = [
    ("context_aware_monitoring/models/roadObjectDetectionYoloV8.pt", 384),
    ("context_aware_monitoring/models/rlmdFilteredModelNov9.pt", 384),
    ("context_aware_monitoring/models/bestV8.pt", 384),
    ("driver_monitoring/models/yolov8n.pt", 320),
    ("driver_monitoring/models/best.pt", 320),
]


def export_model(pt_path: Path, imgsz: int):
    """Export a single .pt model to ONNX."""
    onnx_path = pt_path.with_suffix(".onnx")
    if onnx_path.exists():
        print(f"  [SKIP] Already exists: {onnx_path.name}")
        return onnx_path

    print(f"  Exporting {pt_path.name} → {onnx_path.name}  (imgsz={imgsz})")
    model = YOLO(str(pt_path))
    model.export(format="onnx", imgsz=imgsz, simplify=True, opset=12)
    print(f"  [OK]   {onnx_path.name}")
    return onnx_path


def main():
    parser = argparse.ArgumentParser(description="Export YOLO .pt → .onnx")
    parser.add_argument("--check", action="store_true",
                        help="List models without exporting")
    args = parser.parse_args()

    print("=" * 60)
    print("YOLOv8 Model Export  (.pt → .onnx)")
    print("=" * 60)

    for rel, imgsz in MODELS:
        pt = DEVICE_DIR / rel
        onnx = pt.with_suffix(".onnx")
        status = "EXISTS (.onnx)" if onnx.exists() else ("FOUND (.pt)" if pt.exists() else "MISSING")
        print(f"  {rel:55s}  [{status}]")

    if args.check:
        return

    print("\nStarting export …\n")

    for rel, imgsz in MODELS:
        pt = DEVICE_DIR / rel
        if not pt.exists():
            print(f"  [SKIP] Not found: {rel}")
            continue
        try:
            export_model(pt, imgsz)
        except Exception as e:
            print(f"  [FAIL] {rel}: {e}")

    print("\nDone.  Copy the .onnx files to your Raspberry Pi.")
    print("On the Pi you only need: pip install onnxruntime")


if __name__ == "__main__":
    main()
