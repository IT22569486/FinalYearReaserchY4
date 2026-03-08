"""
Configuration settings for the Bus Tracking Backend Service
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv(Path(__file__).parent / '.env.example')

class Config:
    """Application configuration"""
    
    # MQTT Configuration
    MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
    MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
    MQTT_USER = os.getenv('MQTT_USER', '')
    MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', '')
    MQTT_CLIENT_ID = os.getenv('MQTT_CLIENT_ID', 'bus_tracking_backend')
    
    # Firebase Configuration
    FIREBASE_CREDENTIALS = os.getenv(
        'FIREBASE_CREDENTIALS', 
        '../../backend/research-2-3478d-firebase-adminsdk-fbsvc-335af8ca98.json'
    )
    
    # Socket.IO Configuration
    SOCKET_PORT = int(os.getenv('SOCKET_PORT', 5001))
    SOCKET_CORS_ORIGINS = os.getenv('SOCKET_CORS_ORIGINS', '*')
    
    # API Configuration
    API_PORT = int(os.getenv('API_PORT', 5001))
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    
    # Backend API URL (Node.js backend)
    BACKEND_API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:5000')
    
    # MQTT Topics
    GPS_TOPIC_PATTERN = 'bus/+/gps'
    PASSENGER_TOPIC_PATTERN = 'bus/+/passenger'
    COMMANDS_TOPIC_PATTERN = 'bus/{bus_id}/commands'
    
    # Data retention (in seconds)
    GPS_HISTORY_RETENTION = 3600 * 24  # 24 hours


config = Config()
