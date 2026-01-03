# Driver Monitoring System - React Frontend

A modern React dashboard with Tailwind CSS for real-time driver behavior monitoring.

## Features

- 🔴 **Live Monitor** - Real-time behavior alerts with auto-refresh
- 📊 **Daily Reports** - Comprehensive daily analysis with charts
- 📈 **Statistics** - Multi-period analytics and trends
- 👤 **Driver Management** - Individual driver profiles and stats
- 🚌 **Bus Management** - Fleet monitoring and violation tracking

## Installation

### Prerequisites
- Node.js 16+ and npm
- Backend API running on http://localhost:5000

### Setup Instructions

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Access the application:**
   Open http://localhost:3000 in your browser

## Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── LiveMonitor.js      # Real-time alerts
│   │   ├── DailyReport.js      # Daily reports with charts
│   │   ├── Statistics.js       # Statistics dashboard
│   │   ├── Drivers.js          # Driver management
│   │   └── Buses.js            # Bus management
│   ├── App.js                  # Main app component
│   ├── index.js                # Entry point
│   └── index.css               # Global styles with Tailwind
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## Technologies

- **React 18** - UI framework
- **Tailwind CSS 3** - Utility-first styling
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **React Scripts** - Build tooling

## API Configuration

The frontend connects to the Flask API at `http://localhost:5000/api`

To change the API URL, update the `API_URL` constant in each component:
```javascript
const API_URL = 'http://your-api-url:5000/api';
```

## Available Scripts

- `npm start` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## Features Overview

### Live Monitor
- Auto-refreshes every 2 seconds
- Color-coded severity levels
- Real-time metrics display
- Session tracking

### Daily Report
- Date selector for historical data
- Interactive charts (Bar & Pie)
- Session details table
- Behavior distribution analysis

### Statistics
- Multi-period analysis (7, 14, 30 days)
- Behavior and severity breakdowns
- Visual progress bars
- Detailed percentage calculations

### Driver Management
- Driver list with statistics
- Individual violation tracking
- Recent activity history
- Performance metrics

### Bus Management
- Fleet overview
- Bus-specific violation tracking
- Trip history
- Maintenance insights

## Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme:
```javascript
theme: {
  extend: {
    colors: {
      'critical': '#dc3545',
      'warning': '#ffc107',
      // Add your colors
    }
  }
}
```

### Polling Interval
Adjust the live data refresh rate in `LiveMonitor.js`:
```javascript
const interval = setInterval(fetchLive, 2000); // Change 2000ms
```

## Troubleshooting

### CORS Errors
Ensure Flask API has CORS enabled:
```python
from flask_cors import CORS
CORS(app)
```

### API Connection Failed
1. Check API is running: `curl http://localhost:5000/api/health`
2. Verify MongoDB is connected
3. Check browser console for errors

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

MIT License
