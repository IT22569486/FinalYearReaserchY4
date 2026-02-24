#!/usr/bin/env python3
"""
Convert MiDaS PyTorch model to ONNX format
"""
import torch
import sys
from pathlib import Path

def convert_midas_to_onnx(pytorch_model_path, onnx_output_path, input_size=(256, 256)):
    """
    Convert MiDaS PyTorch model to ONNX format
    
    Args:
        pytorch_model_path: Path to .pt file
        onnx_output_path: Path for output .onnx file
        input_size: Input dimensions (width, height)
    """
    print("="*60)
    print("MiDaS PyTorch to ONNX Converter")
    print("="*60)
    
    pytorch_path = Path(pytorch_model_path)
    if not pytorch_path.exists():
        print(f"❌ Error: Model file not found: {pytorch_model_path}")
        return False
    
    print(f"\n📦 Loading PyTorch model: {pytorch_path.name}")
    
    try:
        # Load the PyTorch model
        model = torch.load(pytorch_model_path, map_location='cpu')
        
        # If it's a state dict, we need to load it into a model architecture
        if isinstance(model, dict):
            print("⚠️ Detected state dict. Attempting to load MiDaS architecture...")
            try:
                # Try to load MiDaS small model architecture from torch hub
                midas = torch.hub.load("intel-isl/MiDaS", "MiDaS_small", pretrained=False)
                midas.load_state_dict(model)
                model = midas
                print("✅ Loaded model architecture from torch hub")
            except Exception as e:
                print(f"❌ Failed to load architecture: {e}")
                print("\nTrying alternative method...")
                # Try DPT_Small
                try:
                    midas = torch.hub.load("intel-isl/MiDaS", "DPT_Small", pretrained=False)
                    midas.load_state_dict(model)
                    model = midas
                    print("✅ Loaded DPT_Small architecture")
                except Exception as e2:
                    print(f"❌ Failed: {e2}")
                    return False
        
        model.eval()
        print("✅ Model loaded successfully")
        
    except Exception as e:
        print(f"❌ Error loading PyTorch model: {e}")
        return False
    
    print(f"\n🔄 Converting to ONNX format...")
    print(f"   Input size: {input_size}")
    
    try:
        # Create dummy input
        batch_size = 1
        dummy_input = torch.randn(batch_size, 3, input_size[1], input_size[0])
        
        # Export to ONNX
        torch.onnx.export(
            model,
            dummy_input,
            onnx_output_path,
            export_params=True,
            opset_version=12,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {0: 'batch_size'},
                'output': {0: 'batch_size'}
            }
        )
        
        print(f"✅ ONNX model saved: {onnx_output_path}")
        
        # Verify the ONNX model
        try:
            import onnx
            onnx_model = onnx.load(onnx_output_path)
            onnx.checker.check_model(onnx_model)
            print("✅ ONNX model verification passed")
        except ImportError:
            print("⚠️ onnx package not installed. Skipping verification.")
            print("   Install with: pip install onnx")
        except Exception as e:
            print(f"⚠️ ONNX verification warning: {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during ONNX conversion: {e}")
        return False


def main():
    print("\n" + "="*60)
    print("MiDaS Model Converter (PyTorch → ONNX)")
    print("="*60 + "\n")
    
    # Get input model path
    if len(sys.argv) > 1:
        pytorch_path = sys.argv[1]
    else:
        pytorch_path = input("Enter PyTorch model path (.pt): ").strip()
    
    if not pytorch_path:
        print("❌ No model path provided")
        return
    
    # Generate output path
    pytorch_file = Path(pytorch_path)
    onnx_path = pytorch_file.parent / (pytorch_file.stem + ".onnx")
    
    print(f"\n📝 Configuration:")
    print(f"   Input:  {pytorch_path}")
    print(f"   Output: {onnx_path}")
    
    # Ask for input size
    size_input = input("\nInput size for model (default: 256): ").strip()
    if size_input:
        try:
            size = int(size_input)
            input_size = (size, size)
        except:
            print("⚠️ Invalid size, using default 256x256")
            input_size = (256, 256)
    else:
        input_size = (256, 256)
    
    print(f"\n🚀 Starting conversion...")
    
    success = convert_midas_to_onnx(pytorch_path, str(onnx_path), input_size)
    
    if success:
        print("\n" + "="*60)
        print("✅ Conversion completed successfully!")
        print("="*60)
        print(f"\n📄 ONNX model saved to: {onnx_path}")
        print(f"\nYou can now use this model with main.py:")
        print(f"   python main.py")
        print(f"   Enter MiDaS path: {onnx_path}")
    else:
        print("\n" + "="*60)
        print("❌ Conversion failed")
        print("="*60)
        print("\nTroubleshooting:")
        print("1. Ensure PyTorch is installed: pip install torch")
        print("2. Check if the .pt file is a valid MiDaS model")
        print("3. Try downloading a different MiDaS model version")
        print("\nAlternative: Download pre-converted ONNX model")
        print("   - https://github.com/isl-org/MiDaS/releases")
        print("   - https://github.com/PINTO0309/PINTO_model_zoo")


if __name__ == '__main__':
    main()
