#!/usr/bin/env python3
"""
CTB Bus Rule Violation Detection System - Main Entry Point

This is the main entry point for all device components.
Each team member can add their component to the COMPONENTS list below.

Features:
- Connects to backend via MQTT for health monitoring
- Runs all enabled components
- Provides shared health monitor for all components

Usage:
    python main.py                    # Run all enabled components
    python main.py --list             # List all available components
    python main.py --run component    # Run specific component
    python main.py --no-mqtt          # Run without MQTT connection
"""

import subprocess
import sys
import os
import time
import threading
import json
from pathlib import Path

# Get the device directory
DEVICE_DIR = Path(__file__).parent.absolute()

# Import health monitor
sys.path.insert(0, str(DEVICE_DIR))
try:
    from device_health_monitor import DeviceHealthMonitor, get_health_monitor
    HEALTH_MONITOR_AVAILABLE = True
except ImportError:
    print("⚠️ Health monitor not available. Install: pip install paho-mqtt psutil")
    HEALTH_MONITOR_AVAILABLE = False

# Global health monitor instance (shared across components)
_health_monitor = None

# =============================================================================
# COMPONENT CONFIGURATION
# Each team member should add their component here
# Format: {
#     'name': 'Component Name',
#     'folder': 'folder_name',
#     'script': 'main_script.py',
#     'description': 'What this component does',
#     'author': 'Your Name',
#     'enabled': True/False
# }
# =============================================================================

COMPONENTS = [
    {
        'name': 'Context Aware Monitoring',
        'folder': 'context_aware_monitoring',
        'script': 'object_distance_measurement.py',
        'description': 'Lane detection, object detection with depth estimation, ADAS warnings',
        'author': 'Sandaru Abey',
        'enabled': True
    },
    # =========================================================================
    # ADD YOUR COMPONENTS BELOW
    # =========================================================================
    # Example:
    # {
    #     'name': 'Speed Monitoring',
    #     'folder': 'speed_monitoring',
    #     'script': 'main.py',
    #     'description': 'GPS-based speed monitoring and violation detection',
    #     'author': 'Friend 1',
    #     'enabled': True
    # },
    # {
    #     'name': 'Passenger Counting',
    #     'folder': 'passenger_counting',
    #     'script': 'main.py',
    #     'description': 'Camera-based passenger counting system',
    #     'author': 'Friend 2',
    #     'enabled': True
    # },
]


def get_python_executable():
    """Get the Python executable from virtual environment"""
    venv_python = DEVICE_DIR / 'device_venv' / 'Scripts' / 'python.exe'
    if venv_python.exists():
        return str(venv_python)
    # Fallback to system Python
    return sys.executable


def init_backend_connection():
    """Initialize connection to backend via MQTT"""
    global _health_monitor
    
    if not HEALTH_MONITOR_AVAILABLE:
        print("⚠️ Cannot connect to backend - health monitor not available")
        return None
    
    try:
        print("\n" + "=" * 60)
        print("🔌 CONNECTING TO CTB BACKEND")
        print("=" * 60)
        
        # Load config
        config_path = DEVICE_DIR / 'device_config.json'
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = json.load(f)
            print(f"   Bus Number: {config.get('bus_number', 'N/A')}")
            print(f"   Route: {config.get('route_number', 'N/A')}")
            print(f"   MQTT Broker: {config.get('mqtt_broker', 'localhost')}:{config.get('mqtt_port', 1883)}")
        
        # Initialize health monitor (pass config_path as keyword argument)
        _health_monitor = get_health_monitor(config_path=str(config_path))
        
        print(f"   Device Key: {_health_monitor.device_key}")
        print()
        
        # Start the health monitor
        _health_monitor.start()
        
        # Wait a moment for connection
        time.sleep(2)
        
        if _health_monitor.is_connected:
            print("✅ Connected to backend!")
            print(f"   Queue Size: {_health_monitor.offline_queue.size()} messages")
        else:
            print("⚠️ Not connected yet - messages will be queued offline")
            print(f"   Queue Size: {_health_monitor.offline_queue.size()} messages")
        
        print("=" * 60 + "\n")
        return _health_monitor
        
    except Exception as e:
        print(f"❌ Failed to connect to backend: {e}")
        return None


def get_shared_health_monitor():
    """Get the shared health monitor instance"""
    global _health_monitor
    return _health_monitor


def update_component_status(component_name, status='running', details=None):
    """Update component status to backend"""
    global _health_monitor
    
    if _health_monitor:
        try:
            _health_monitor.publish_message(
                f'ctb/bus/{_health_monitor.device_key}/component',
                {
                    'component': component_name,
                    'status': status,
                    'details': details or {},
                    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                }
            )
        except Exception as e:
            print(f"⚠️ Failed to update component status: {e}")


def list_components():
    """List all available components"""
    print("\n" + "=" * 70)
    print("CTB BUS RULE VIOLATION DETECTION SYSTEM - COMPONENTS")
    print("=" * 70)
    
    # Show backend connection status
    if _health_monitor:
        status = "🟢 Connected" if _health_monitor.is_connected else "🟡 Offline (Queued)"
        print(f"\nBackend Status: {status}")
        print(f"Device Key: {_health_monitor.device_key}")
        print(f"Queue: {_health_monitor.offline_queue.size()} messages")
    else:
        print(f"\nBackend Status: ❌ Not Connected")
    
    for i, comp in enumerate(COMPONENTS, 1):
        status = "✅ ENABLED" if comp['enabled'] else "❌ DISABLED"
        folder_path = DEVICE_DIR / comp['folder']
        exists = "📁 Found" if folder_path.exists() else "⚠️ Not Found"
        
        print(f"\n[{i}] {comp['name']} ({status})")
        print(f"    Folder: {comp['folder']}/ ({exists})")
        print(f"    Script: {comp['script']}")
        print(f"    Author: {comp['author']}")
        print(f"    Description: {comp['description']}")
    
    print("\n" + "=" * 70)
    print(f"Total Components: {len(COMPONENTS)}")
    print(f"Enabled: {sum(1 for c in COMPONENTS if c['enabled'])}")
    print("=" * 70 + "\n")


def run_component(component, python_exe):
    """Run a single component"""
    folder_path = DEVICE_DIR / component['folder']
    script_path = folder_path / component['script']
    
    if not folder_path.exists():
        print(f"❌ Component folder not found: {folder_path}")
        return False
    
    if not script_path.exists():
        print(f"❌ Script not found: {script_path}")
        return False
    
    print(f"\n{'=' * 50}")
    print(f"🚀 Starting: {component['name']}")
    print(f"   Script: {script_path}")
    print(f"{'=' * 50}\n")
    
    # Update component status to backend
    update_component_status(component['name'], 'starting')
    
    try:
        # Run the component script
        process = subprocess.Popen(
            [python_exe, str(script_path)],
            cwd=str(folder_path),
            stdout=sys.stdout,
            stderr=sys.stderr,
            stdin=sys.stdin
        )
        
        # Update status
        update_component_status(component['name'], 'running')
        
        return process
    except Exception as e:
        print(f"❌ Failed to start {component['name']}: {e}")
        update_component_status(component['name'], 'error', {'error': str(e)})
        return None


def run_single_component(component_name, use_mqtt=True):
    """Run a specific component by name"""
    python_exe = get_python_executable()
    
    # Connect to backend if enabled
    if use_mqtt:
        init_backend_connection()
    
    # Find the component
    component = None
    for comp in COMPONENTS:
        if comp['name'].lower() == component_name.lower() or comp['folder'].lower() == component_name.lower():
            component = comp
            break
    
    if component is None:
        print(f"❌ Component not found: {component_name}")
        print("\nAvailable components:")
        for comp in COMPONENTS:
            print(f"  - {comp['name']} ({comp['folder']})")
        return
    
    process = run_component(component, python_exe)
    if process:
        try:
            process.wait()
            update_component_status(component['name'], 'stopped')
        except KeyboardInterrupt:
            print(f"\n⏹️ Stopping {component['name']}...")
            update_component_status(component['name'], 'stopped')
            process.terminate()
        finally:
            shutdown_backend()


def run_all_components(use_mqtt=True):
    """Run all enabled components"""
    python_exe = get_python_executable()
    
    # Connect to backend if enabled
    if use_mqtt:
        init_backend_connection()
    
    enabled_components = [c for c in COMPONENTS if c['enabled']]
    
    if not enabled_components:
        print("❌ No enabled components found!")
        return
    
    print("\n" + "=" * 70)
    print("🚌 CTB BUS RULE VIOLATION DETECTION SYSTEM")
    print("=" * 70)
    
    # Show connection status
    if _health_monitor:
        status = "🟢 Connected" if _health_monitor.is_connected else "🟡 Offline Mode"
        print(f"Backend: {status}")
        print(f"Device Key: {_health_monitor.device_key}")
    
    print(f"\n🚀 Starting {len(enabled_components)} component(s)...\n")
    
    processes = []
    
    for component in enabled_components:
        process = run_component(component, python_exe)
        if process:
            processes.append((component['name'], process))
            time.sleep(1)  # Small delay between starting components
    
    if not processes:
        print("❌ No components started successfully!")
        return
    
    print(f"\n✅ {len(processes)} component(s) running")
    print("Press Ctrl+C to stop all components\n")
    
    try:
        # Wait for all processes
        while True:
            all_finished = True
            for name, proc in processes:
                if proc.poll() is None:
                    all_finished = False
            
            if all_finished:
                break
            
            time.sleep(1)
    
    except KeyboardInterrupt:
        print("\n\n⏹️ Stopping all components...")
        for name, proc in processes:
            print(f"   Stopping {name}...")
            update_component_status(name, 'stopped')
            proc.terminate()
        
        # Wait for processes to terminate
        for name, proc in processes:
            proc.wait()
        
        print("✅ All components stopped\n")
    
    finally:
        shutdown_backend()


def shutdown_backend():
    """Properly shutdown backend connection"""
    global _health_monitor
    
    if _health_monitor:
        try:
            print("📡 Disconnecting from backend...")
            _health_monitor.stop()
            _health_monitor = None
            print("✅ Backend disconnected")
        except Exception as e:
            print(f"⚠️ Error disconnecting: {e}")


def interactive_menu(use_mqtt=True):
    """Show interactive menu"""
    
    # Connect to backend
    if use_mqtt:
        init_backend_connection()
    
    try:
        while True:
            print("\n" + "=" * 50)
            print("🚌 CTB BUS VIOLATION DETECTION SYSTEM")
            print("=" * 50)
            
            # Show connection status
            if _health_monitor:
                status = "🟢 Connected" if _health_monitor.is_connected else "🟡 Offline"
                queue_size = _health_monitor.offline_queue.size()
                print(f"Backend: {status} | Queue: {queue_size}")
            else:
                print("Backend: ❌ Not Connected")
            
            print("\n[1] Run all enabled components")
            print("[2] Run specific component")
            print("[3] List all components")
            print("[4] Check backend status")
            print("[5] Exit")
            print()
            
            choice = input("Select option: ").strip()
            
            if choice == '1':
                run_all_components(use_mqtt=False)  # Already connected
            elif choice == '2':
                list_components()
                comp_name = input("\nEnter component name or folder: ").strip()
                if comp_name:
                    run_single_component(comp_name, use_mqtt=False)  # Already connected
            elif choice == '3':
                list_components()
            elif choice == '4':
                show_backend_status()
            elif choice == '5':
                print("Goodbye! 👋")
                break
            else:
                print("Invalid option. Please try again.")
    
    finally:
        shutdown_backend()


def show_backend_status():
    """Show detailed backend connection status"""
    print("\n" + "=" * 50)
    print("📡 BACKEND CONNECTION STATUS")
    print("=" * 50)
    
    if not _health_monitor:
        print("❌ Health monitor not initialized")
        return
    
    print(f"Device Key: {_health_monitor.device_key}")
    print(f"Bus Number: {_health_monitor.bus_number}")
    print(f"Route: {_health_monitor.route_number}")
    print(f"MQTT Broker: {_health_monitor.mqtt_broker}:{_health_monitor.mqtt_port}")
    print(f"Connected: {'Yes ✅' if _health_monitor.is_connected else 'No ❌'}")
    print(f"Offline Queue: {_health_monitor.offline_queue.size()} messages")
    print(f"Health Interval: {_health_monitor.health_interval} seconds")
    print("=" * 50)


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="CTB Bus Rule Violation Detection System - Main Entry Point"
    )
    parser.add_argument('--list', action='store_true', help='List all components')
    parser.add_argument('--run', type=str, help='Run specific component by name')
    parser.add_argument('--all', action='store_true', help='Run all enabled components')
    parser.add_argument('--no-mqtt', action='store_true', help='Run without MQTT backend connection')
    parser.add_argument('--status', action='store_true', help='Show backend connection status')
    
    args = parser.parse_args()
    use_mqtt = not args.no_mqtt
    
    if args.list:
        if use_mqtt:
            init_backend_connection()
        list_components()
        if use_mqtt:
            shutdown_backend()
    elif args.status:
        init_backend_connection()
        show_backend_status()
        shutdown_backend()
    elif args.run:
        run_single_component(args.run, use_mqtt=use_mqtt)
    elif args.all:
        run_all_components(use_mqtt=use_mqtt)
    else:
        # Interactive menu
        interactive_menu(use_mqtt=use_mqtt)


if __name__ == '__main__':
    main()
