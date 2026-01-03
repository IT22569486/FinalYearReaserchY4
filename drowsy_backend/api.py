"""
Flask REST API for Driver Monitoring System
Provides endpoints for retrieving behavior logs, sessions, and reports
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from db_logger import DriverBehaviorLogger
from datetime import datetime, timedelta
from bson import json_util, ObjectId
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize logger (without starting a session)
logger = DriverBehaviorLogger()

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable format"""
    return json.loads(json_util.dumps(doc))

@app.route('/')
def home():
    """API home endpoint"""
    return jsonify({
        'message': 'Driver Monitoring System API',
        'version': '1.0',
        'endpoints': {
            'behaviors': '/api/behaviors/recent',
            'live': '/api/behaviors/live',
            'daily_report': '/api/report/daily?date=YYYY-MM-DD',
            'driver_stats': '/api/driver/<driver_id>/stats',
            'bus_stats': '/api/bus/<bus_number>/stats',
            'drivers': '/api/drivers',
            'buses': '/api/buses',
            'sessions': '/api/sessions',
            'summary': '/api/stats/summary?days=7'
        }
    })

@app.route('/api/behaviors/recent', methods=['GET'])
def get_recent_behaviors():
    """Get recent behavior events (default: last 100)"""
    limit = int(request.args.get('limit', 100))
    
    behaviors = list(logger.behaviors_collection.find(
        {},
        {'_id': 0}
    ).sort('timestamp', -1).limit(limit))
    
    return jsonify(serialize_doc(behaviors))

@app.route('/api/behaviors/live', methods=['GET'])
def get_live_behaviors():
    """Get behaviors from last N seconds (default: 10 seconds)"""
    seconds = int(request.args.get('seconds', 10))
    time_ago = datetime.now() - timedelta(seconds=seconds)
    
    behaviors = list(logger.behaviors_collection.find(
        {'timestamp': {'$gte': time_ago}},
        {'_id': 0}
    ).sort('timestamp', -1))
    
    return jsonify(serialize_doc(behaviors))

@app.route('/api/report/daily', methods=['GET'])
def get_daily_report():
    """
    Get daily report for a specific date
    Query params: date (YYYY-MM-DD), driver_id, bus_number
    """
    date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    driver_id = request.args.get('driver_id')
    bus_number = request.args.get('bus_number')
    
    try:
        report = logger.generate_daily_report(date, driver_id, bus_number)
        return jsonify(report)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Get all sessions with optional filters"""
    driver_id = request.args.get('driver_id')
    bus_number = request.args.get('bus_number')
    limit = int(request.args.get('limit', 50))
    
    query = {}
    if driver_id:
        query['driver_id'] = driver_id
    if bus_number:
        query['bus_number'] = bus_number
    
    sessions = list(logger.sessions_collection.find(query).sort('start_time', -1).limit(limit))
    
    return jsonify(serialize_doc(sessions))

@app.route('/api/sessions/<session_id>', methods=['GET'])
def get_session_detail(session_id):
    """Get detailed information about a specific session"""
    try:
        session = logger.sessions_collection.find_one({'_id': ObjectId(session_id)})
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Get behaviors for this session
        behaviors = list(logger.behaviors_collection.find(
            {'session_id': ObjectId(session_id)}
        ).sort('timestamp', 1))
        
        result = serialize_doc(session)
        result['behaviors'] = serialize_doc(behaviors)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/driver/<driver_id>/stats', methods=['GET'])
def get_driver_statistics(driver_id):
    """Get statistics for a specific driver"""
    stats = logger.get_driver_stats(driver_id)
    return jsonify(serialize_doc(stats))

@app.route('/api/bus/<bus_number>/stats', methods=['GET'])
def get_bus_statistics(bus_number):
    """Get statistics for a specific bus"""
    stats = logger.get_bus_stats(bus_number)
    return jsonify(serialize_doc(stats))

@app.route('/api/drivers', methods=['GET'])
def get_all_drivers():
    """Get all registered drivers"""
    drivers = list(logger.drivers_collection.find({}, {'_id': 0}).sort('driver_name', 1))
    return jsonify(serialize_doc(drivers))

@app.route('/api/buses', methods=['GET'])
def get_all_buses():
    """Get all registered buses"""
    buses = list(logger.buses_collection.find({}, {'_id': 0}).sort('bus_number', 1))
    return jsonify(serialize_doc(buses))

@app.route('/api/stats/summary', methods=['GET'])
def get_summary_stats():
    """
    Get summary statistics for the last N days
    Query params: days (default: 7)
    """
    days = int(request.args.get('days', 7))
    start_date = datetime.now() - timedelta(days=days)
    
    # Total alerts
    total_alerts = logger.behaviors_collection.count_documents(
        {'timestamp': {'$gte': start_date}}
    )
    
    # Behavior breakdown
    behavior_breakdown = list(logger.behaviors_collection.aggregate([
        {'$match': {'timestamp': {'$gte': start_date}}},
        {'$group': {'_id': '$behavior_type', 'count': {'$sum': 1}}}
    ]))
    
    # Severity breakdown
    severity_breakdown = list(logger.behaviors_collection.aggregate([
        {'$match': {'timestamp': {'$gte': start_date}}},
        {'$group': {'_id': '$severity', 'count': {'$sum': 1}}}
    ]))
    
    # Total sessions
    total_sessions = logger.sessions_collection.count_documents(
        {'start_time': {'$gte': start_date}}
    )
    
    # Active drivers
    active_drivers = logger.sessions_collection.distinct(
        'driver_id',
        {'start_time': {'$gte': start_date}}
    )
    
    return jsonify({
        'period_days': days,
        'start_date': start_date.isoformat(),
        'total_alerts': total_alerts,
        'total_sessions': total_sessions,
        'active_drivers': len(active_drivers),
        'behavior_breakdown': {b['_id']: b['count'] for b in behavior_breakdown},
        'severity_breakdown': {s['_id']: s['count'] for s in severity_breakdown}
    })

@app.route('/api/behaviors/by-driver', methods=['GET'])
def get_behaviors_by_driver():
    """Get behavior counts grouped by driver"""
    days = int(request.args.get('days', 7))
    start_date = datetime.now() - timedelta(days=days)
    
    pipeline = [
        {'$match': {'timestamp': {'$gte': start_date}}},
        {
            '$group': {
                '_id': '$driver_id',
                'total_violations': {'$sum': 1},
                'behaviors': {'$push': '$behavior_type'}
            }
        },
        {'$sort': {'total_violations': -1}}
    ]
    
    results = list(logger.behaviors_collection.aggregate(pipeline))
    return jsonify(serialize_doc(results))

@app.route('/api/behaviors/by-bus', methods=['GET'])
def get_behaviors_by_bus():
    """Get behavior counts grouped by bus"""
    days = int(request.args.get('days', 7))
    start_date = datetime.now() - timedelta(days=days)
    
    pipeline = [
        {'$match': {'timestamp': {'$gte': start_date}}},
        {
            '$group': {
                '_id': '$bus_number',
                'total_violations': {'$sum': 1},
                'behaviors': {'$push': '$behavior_type'}
            }
        },
        {'$sort': {'total_violations': -1}}
    ]
    
    results = list(logger.behaviors_collection.aggregate(pipeline))
    return jsonify(serialize_doc(results))

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test MongoDB connection
        logger.client.admin.command('ping')
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 503

if __name__ == '__main__':
    print("=" * 60)
    print("Driver Monitoring System API")
    print("=" * 60)
    print("API Server starting on http://localhost:5000")
    print("\nAvailable endpoints:")
    print("  - GET  /                           - API documentation")
    print("  - GET  /api/health                 - Health check")
    print("  - GET  /api/behaviors/recent       - Recent behaviors")
    print("  - GET  /api/behaviors/live         - Live behaviors")
    print("  - GET  /api/report/daily           - Daily report")
    print("  - GET  /api/sessions               - All sessions")
    print("  - GET  /api/drivers                - All drivers")
    print("  - GET  /api/buses                  - All buses")
    print("  - GET  /api/stats/summary          - Summary statistics")
    print("=" * 60)
    
    app.run(debug=True, port=5000, host='0.0.0.0')
