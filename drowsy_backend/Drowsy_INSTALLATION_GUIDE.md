# Driver Monitoring System - Installation Guide

## Step-by-Step Installation and Setup
.\venv\Scripts\activate
### Step 1: Install MongoDB

#### Windows:
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Run the installer (mongodb-windows-x86_64-*.msi)
3. Choose "Complete" installation
4. Install MongoDB as a Service (check the box)
5. Install MongoDB Compass (optional GUI tool)

#### Start MongoDB:
MongoDB should start automatically as a service. To check:
```powershell
# Check if MongoDB service is running
Get-Service -Name MongoDB

# If not running, start it
Start-Service -Name MongoDB
```

#### Alternative - MongoDB Atlas (Cloud):
If you prefer cloud database:
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (free tier available)
4. Get connection string and set environment variable:
```powershell
$env:MONGO_URI = "mongodb+srv://username:password@cluster.mongodb.net/"
```

### Step 2: Install Python Packages

Open PowerShell in your project directory and run:

```powershell
# Install MongoDB driver, Flask, and Pandas with compatible versions
pip install pymongo==4.5.0 flask==2.3.3 flask-cors==4.0.0 pandas==2.0.3
```

### Step 3: Verify Installation

```powershell
# Test imports
python -c "import pymongo, flask, pandas; print('✓ All packages installed successfully')"

# Check MongoDB connection
python -c "from pymongo import MongoClient; client = MongoClient('mongodb://localhost:27017/'); client.admin.command('ping'); print('✓ MongoDB connection successful')"
```

### Step 4: Configure Your System

Edit `config.json` to set your driver and bus information:
```json
{
    "driver_id": "DRV001",
    "driver_name": "Your Name",
    "license_number": "YOUR_LICENSE",
    "bus_number": "BUS-123",
    "bus_model": "Your Bus Model",
    "bus_capacity": 50
}
```

### Step 5: Test the System

#### Test 1: Run the Driver Monitoring Application
```powershell
python a.py
```

Expected output:
```
✓ Config loaded: Driver Your Name (DRV001) - Bus BUS-123
✓ Model and Scaler loaded successfully.
✓ MongoDB connected: driver_monitoring
✓ Driver registered: DRV001 - Your Name
✓ Bus registered: BUS-123 - Your Bus Model
✓ Session started: 6581234567890abcdef12345
  Driver: DRV001 | Bus: BUS-123
✓ MongoDB logger initialized and session started.
```

Press ESC to exit. You should see:
```
✓ Session ended: 6581234567890abcdef12345
  Duration: 0:02:15.123456
  Total Alerts: 5
✓ Database logging completed and session closed.
```

#### Test 2: Run the API Server
```powershell
python api.py
```

Expected output:
```
============================================================
Driver Monitoring System API
============================================================
API Server starting on http://localhost:5000
...
```

#### Test 3: Test API Endpoints
Open a new PowerShell window:
```powershell
# Test health check
curl http://localhost:5000/api/health

# Get recent behaviors
curl http://localhost:5000/api/behaviors/recent

# Get all drivers
curl http://localhost:5000/api/drivers

# Get all buses
curl http://localhost:5000/api/buses

# Get summary stats
curl http://localhost:5000/api/stats/summary
```

### Step 6: View Data in MongoDB

#### Option A: MongoDB Compass (GUI)
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Select database: `driver_monitoring`
4. Browse collections:
   - `behaviors` - All behavior events
   - `sessions` - Driving sessions
   - `drivers` - Driver information
   - `buses` - Bus information
   - `daily_reports` - Generated reports

#### Option B: MongoDB Shell
```powershell
# Open MongoDB shell
mongosh

# Use the database
use driver_monitoring

# View collections
show collections

# View recent behaviors
db.behaviors.find().limit(5).pretty()

# View drivers
db.drivers.find().pretty()

# View sessions
db.sessions.find().limit(5).pretty()

# Count total violations
db.behaviors.count()
```

### Troubleshooting

#### Problem: "No module named 'pymongo'"
Solution:
```powershell
pip install pymongo==4.5.0
```

#### Problem: "Cannot connect to MongoDB"
Solution:
```powershell
# Check if MongoDB service is running
Get-Service -Name MongoDB

# If not running, start it
Start-Service -Name MongoDB

# Or restart it
Restart-Service -Name MongoDB
```

#### Problem: "Config file not found"
Solution: Make sure `config.json` exists in the same directory as `a.py`

#### Problem: Flask CORS errors
Solution:
```powershell
pip install flask-cors==4.0.0
```

### Next Steps

1. **Run the monitoring system**: `python a.py`
2. **In another terminal, run the API**: `python api.py`
3. **Access API in browser**: http://localhost:5000
4. **View live behaviors**: http://localhost:5000/api/behaviors/live
5. **View daily report**: http://localhost:5000/api/report/daily

### Production Tips

1. **Set MongoDB password** for security
2. **Use environment variables** for sensitive data:
   ```powershell
   $env:MONGO_URI = "mongodb://username:password@localhost:27017/"
   ```
3. **Run Flask with production server** (Gunicorn/Waitress)
4. **Enable HTTPS** for API endpoints
5. **Set up automatic backups** for MongoDB

### File Structure

```
lstm_update/
├── a.py                    # Main driver monitoring app
├── api.py                  # Flask REST API
├── db_logger.py            # MongoDB logger class
├── config.json             # Driver & Bus configuration
├── dms_lstm_model.h5       # Trained model
├── dms_scaler.pkl          # Feature scaler
├── yolov8n.pt             # YOLO model
└── face_landmarker.task   # MediaPipe model
```

### Support

For issues:
1. Check MongoDB is running: `Get-Service -Name MongoDB`
2. Verify Python packages: `pip list`
3. Check logs in terminal output
4. Test MongoDB connection: Use MongoDB Compass
