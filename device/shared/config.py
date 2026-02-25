"""
Centralized Device Configuration Loader.

All components read bus info, MQTT settings, camera config, etc.
from the single device_config.json file through this class.
"""

import json
from pathlib import Path

DEVICE_DIR = Path(__file__).parent.parent.absolute()
DEFAULT_CONFIG_PATH = DEVICE_DIR / "device_config.json"


class DeviceConfig:
    """
    Loads and exposes all configuration from device_config.json.
    Provides typed accessors for every section.
    """

    def __init__(self, config_path=None):
        self.config_path = Path(config_path) if config_path else DEFAULT_CONFIG_PATH
        self._data = {}
        self._load()

    def _load(self):
        if self.config_path.exists():
            with open(self.config_path, "r") as f:
                self._data = json.load(f)
        else:
            print(f"[Config] WARNING: {self.config_path} not found, using defaults")
            self._data = {}

    def reload(self):
        """Hot-reload config from file."""
        self._load()

    # ------ generic accessors ------ #

    def get(self, key, default=None):
        return self._data.get(key, default)

    @property
    def raw(self):
        """Return the raw config dict."""
        return dict(self._data)

    # ------ bus / vehicle info ------ #

    @property
    def bus_number(self):
        return self._data.get("bus_number", "UNKNOWN")

    @property
    def route_number(self):
        return self._data.get("route_number", "")

    @property
    def vehicle_id(self):
        return self._data.get("vehicle_id", self.bus_number)

    @property
    def route_id(self):
        return self._data.get("route_id", "")

    @property
    def device_key(self):
        return self._data.get("device_key", "CTB-UNKNOWN")

    # ------ MQTT ------ #

    @property
    def mqtt_broker(self):
        mqtt = self._data.get("mqtt", {})
        return mqtt.get("broker", self._data.get("mqtt_broker", "localhost"))

    @property
    def mqtt_port(self):
        mqtt = self._data.get("mqtt", {})
        return mqtt.get("port", self._data.get("mqtt_port", 1883))

    @property
    def mqtt_topic_base(self):
        mqtt = self._data.get("mqtt", {})
        return mqtt.get("topic_base", self._data.get("mqtt_topic_base", "ctb/bus"))

    @property
    def mqtt_username(self):
        mqtt = self._data.get("mqtt", {})
        return mqtt.get("username", self._data.get("mqtt_username", ""))

    @property
    def mqtt_password(self):
        mqtt = self._data.get("mqtt", {})
        return mqtt.get("password", self._data.get("mqtt_password", ""))

    # ------ Camera ------ #

    @property
    def camera_config(self):
        return self._data.get("camera", {
            "index": 0, "width": 640, "height": 480, "fps": 15
        })

    @property
    def camera_index(self):
        return self.camera_config.get("index", 0)

    @property
    def camera_width(self):
        return self.camera_config.get("width", 640)

    @property
    def camera_height(self):
        return self.camera_config.get("height", 480)

    @property
    def camera_fps(self):
        return self.camera_config.get("fps", 15)

    # ------ GPS ------ #

    @property
    def gps_config(self):
        return self._data.get("gps", {
            "enabled": False, "simulation": True
        })

    @property
    def gps_enabled(self):
        return self.gps_config.get("enabled", False)

    @property
    def gps_simulation(self):
        return self.gps_config.get("simulation", True)

    # ------ Component configs ------ #

    def get_component_config(self, component_name):
        """Get config for a specific component."""
        components = self._data.get("components", {})
        return components.get(component_name, {})

    def is_component_enabled(self, component_name):
        """Check if a component is enabled in config."""
        comp = self.get_component_config(component_name)
        return comp.get("enabled", True)

    # ------ Vehicle ------ #

    @property
    def vehicle_speed_kmh(self):
        return self._data.get("vehicle_speed_kmh", 40)

    # ------ Other ------ #

    @property
    def health_interval(self):
        return self._data.get("health_interval_seconds", 30)

    @property
    def openweather_api_key(self):
        return self._data.get("openweather_api_key", "")

    @property
    def send_interval(self):
        return self._data.get("send_interval_seconds", 5)

    def __repr__(self):
        return (
            f"DeviceConfig(bus={self.bus_number}, route={self.route_number}, "
            f"device={self.device_key}, mqtt={self.mqtt_broker}:{self.mqtt_port})"
        )
