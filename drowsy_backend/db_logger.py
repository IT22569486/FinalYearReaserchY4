"""
MongoDB Logger for Driver Monitoring System
Logs driver behaviors, sessions, and generates daily reports
"""

from pymongo import MongoClient
from datetime import datetime, timedelta
import os
from collections import deque
from threading import Lock, Thread
import time

class DriverBehaviorLogger:
    def __init__(self, driver_id=None, bus_number=None):
        """
        Initialize the logger with MongoDB connection
        
        Args:
            driver_id: Unique identifier for the driver
            bus_number: Bus identification number
        """
        # MongoDB connection - Try Atlas first, fallback to local
        mongo_uri = os.getenv('MONGO_URI', 'mongodb+srv://heshanjeewantha_db_user:TvOB5jWlnAJYGL0d@cluster0.23z9vaw.mongodb.net/?appName=Cluster0')
        
        try:
            self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            # Test connection
            self.client.admin.command('ping')
            self.db = self.client['driver_monitoring']
            print(f" MongoDB connected successfully")
        except Exception as e:
            print(f" MongoDB connection failed: {e}")
            print("Trying local MongoDB...")
            try:
                self.client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
                self.client.admin.command('ping')
                self.db = self.client['driver_monitoring']
                print(f" Connected to local MongoDB")
            except Exception as e2:
                print(f" Error: Cannot connect to MongoDB. Make sure MongoDB is running.")
                print(f"   Local: {e2}")
                raise
        
        # Collections
        self.behaviors_collection = self.db['behaviors']
        self.sessions_collection = self.db['sessions']
        self.daily_reports_collection = self.db['daily_reports']
        self.drivers_collection = self.db['drivers']
        self.buses_collection = self.db['buses']
        
        # Create indexes for better query performance
        self.behaviors_collection.create_index([('timestamp', -1)])
        self.behaviors_collection.create_index([('session_id', 1)])
        self.behaviors_collection.create_index([('driver_id', 1)])
        self.behaviors_collection.create_index([('bus_number', 1)])
        self.behaviors_collection.create_index([('behavior_type', 1)])
        
        self.sessions_collection.create_index([('start_time', -1)])
        self.sessions_collection.create_index([('driver_id', 1)])
        self.sessions_collection.create_index([('bus_number', 1)])
        
        # Driver and Bus info
        self.driver_id = driver_id
        self.bus_number = bus_number
        
        # Batch logging for performance
        self.batch_buffer = []
        self.batch_lock = Lock()
        self.batch_size = 10  # Write every 10 events
        self.batch_timeout = 5  # Or every 5 seconds
        self.last_batch_time = time.time()
        
        # Current session
        self.session_id = None
        
        print(f"MongoDB connected: {self.db.name}")
    
    def set_driver_info(self, driver_id, driver_name, license_number):
        """
        Register or update driver information
        
        Args:
            driver_id: Unique driver identifier
            driver_name: Full name of the driver
            license_number: Driver's license number
        """
        driver_data = {
            'driver_id': driver_id,
            'driver_name': driver_name,
            'license_number': license_number,
            'updated_at': datetime.now()
        }
        
        self.drivers_collection.update_one(
            {'driver_id': driver_id},
            {
                '$set': driver_data,
                '$setOnInsert': {
                    'registered_at': datetime.now(),
                    'total_sessions': 0,
                    'total_violations': 0
                }
            },
            upsert=True
        )
        self.driver_id = driver_id
        print(f"✓ Driver registered: {driver_id} - {driver_name}")
    
    def set_bus_info(self, bus_number, bus_model, capacity):
        """
        Register or update bus information
        
        Args:
            bus_number: Bus identification number
            bus_model: Model/make of the bus
            capacity: Passenger capacity
        """
        bus_data = {
            'bus_number': bus_number,
            'bus_model': bus_model,
            'capacity': capacity,
            'updated_at': datetime.now()
        }
        
        self.buses_collection.update_one(
            {'bus_number': bus_number},
            {
                '$set': bus_data,
                '$setOnInsert': {
                    'registered_at': datetime.now(),
                    'total_trips': 0,
                    'total_violations': 0
                }
            },
            upsert=True
        )
        self.bus_number = bus_number
        print(f"✓ Bus registered: {bus_number} - {bus_model}")
    
    def start_session(self):
        """Start a new driving session"""
        session = {
            'driver_id': self.driver_id,
            'bus_number': self.bus_number,
            'start_time': datetime.now(),
            'end_time': None,
            'total_alerts': 0,
            'alert_breakdown': {},
            'status': 'active'
        }
        result = self.sessions_collection.insert_one(session)
        self.session_id = result.inserted_id
        
        # Update driver and bus trip counts
        if self.driver_id:
            self.drivers_collection.update_one(
                {'driver_id': self.driver_id},
                {'$inc': {'total_sessions': 1}}
            )
        if self.bus_number:
            self.buses_collection.update_one(
                {'bus_number': self.bus_number},
                {'$inc': {'total_trips': 1}}
            )
        
        print(f" Session started: {self.session_id}")
        print(f"  Driver: {self.driver_id} | Bus: {self.bus_number}")
        return self.session_id
    
    def log_behavior(self, behavior_type, severity, metrics):
        """
        Log a driver behavior event with driver and bus information (batched for performance)
        
        Args:
            behavior_type: str - 'phone_use', 'drowsy', 'yawning', 'head_turned', 'hands_off', 'sleep'
            severity: str - 'critical', 'warning', 'notice', 'normal'
            metrics: dict - {'ear': 0.25, 'mar': 0.3, 'yaw': 15.5, 'num_hands': 0, 'phone_detected': True}
        """
        if behavior_type == 'alert':
            return  # Don't log normal alert states
        
        event = {
            'session_id': self.session_id,
            'driver_id': self.driver_id,
            'bus_number': self.bus_number,
            'timestamp': datetime.now(),
            'behavior_type': behavior_type,
            'severity': severity,
            'metrics': metrics
        }
        
        # Add to batch buffer instead of immediate write
        with self.batch_lock:
            self.batch_buffer.append(event)
            
            # Suppress verbose output - only show when flushing
            
            # Flush batch if size threshold reached or timeout exceeded
            current_time = time.time()
            if len(self.batch_buffer) >= self.batch_size or (current_time - self.last_batch_time) >= self.batch_timeout:
                self._flush_batch()
        
        print(f" Queued: {behavior_type.upper()} - {severity}")
    
    def _flush_batch(self):
        """Internal method to flush batched events to database"""
        if not self.batch_buffer:
            return
        
        try:
            # Bulk insert all events
            self.behaviors_collection.insert_many(self.batch_buffer)
            
            # Update session stats in one operation
            behavior_counts = {}
            for event in self.batch_buffer:
                bt = event['behavior_type']
                behavior_counts[bt] = behavior_counts.get(bt, 0) + 1
            
            update_ops = {
                '$inc': {
                    'total_alerts': len(self.batch_buffer),
                    **{f'alert_breakdown.{bt}': count for bt, count in behavior_counts.items()}
                }
            }
            self.sessions_collection.update_one({'_id': self.session_id}, update_ops)
            
            # Update driver and bus violation counts
            if self.driver_id:
                self.drivers_collection.update_one(
                    {'driver_id': self.driver_id},
                    {'$inc': {'total_violations': len(self.batch_buffer)}}
                )
            if self.bus_number:
                self.buses_collection.update_one(
                    {'bus_number': self.bus_number},
                    {'$inc': {'total_violations': len(self.batch_buffer)}}
                )
            
            print(f"✓ Flushed {len(self.batch_buffer)} events to database")
            self.batch_buffer.clear()
            self.last_batch_time = time.time()
            
        except Exception as e:
            print(f"Error flushing batch: {e}")
    
    def end_session(self):
        """End the current driving session"""
        # Flush any remaining batched events
        with self.batch_lock:
            if self.batch_buffer:
                self._flush_batch()
        
        if self.session_id:
            session_data = self.sessions_collection.find_one({'_id': self.session_id})
            if session_data:
                duration = datetime.now() - session_data['start_time']
                self.sessions_collection.update_one(
                    {'_id': self.session_id},
                    {
                        '$set': {
                            'end_time': datetime.now(),
                            'duration_seconds': duration.total_seconds(),
                            'status': 'completed'
                        }
                    }
                )
                print(f"✓ Session ended: {self.session_id}")
                print(f"  Duration: {duration}")
                print(f"  Total Alerts: {session_data.get('total_alerts', 0)}")
    
    def generate_daily_report(self, date=None, driver_id=None, bus_number=None):
        """
        Generate a daily report for a specific date, driver, or bus
        
        Args:
            date: Date string in 'YYYY-MM-DD' format (default: today)
            driver_id: Filter by specific driver (optional)
            bus_number: Filter by specific bus (optional)
            
        Returns:
            dict: Report data with sessions, behaviors, and statistics
        """
        if date is None:
            date = datetime.now().date()
        else:
            date = datetime.strptime(date, '%Y-%m-%d').date()
        
        start_of_day = datetime.combine(date, datetime.min.time())
        end_of_day = datetime.combine(date, datetime.max.time())
        
        # Build match criteria
        match_criteria = {'timestamp': {'$gte': start_of_day, '$lte': end_of_day}}
        if driver_id:
            match_criteria['driver_id'] = driver_id
        if bus_number:
            match_criteria['bus_number'] = bus_number
        
        # Aggregate behavior data
        pipeline = [
            {'$match': match_criteria},
            {
                '$group': {
                    '_id': '$behavior_type',
                    'count': {'$sum': 1},
                    'severity_breakdown': {'$push': '$severity'}
                }
            }
        ]
        
        behaviors = list(self.behaviors_collection.aggregate(pipeline))
        
        # Get session data
        session_match = {'start_time': {'$gte': start_of_day, '$lte': end_of_day}}
        if driver_id:
            session_match['driver_id'] = driver_id
        if bus_number:
            session_match['bus_number'] = bus_number
        
        sessions = list(self.sessions_collection.find(session_match))
        
        report = {
            'date': date.isoformat(),
            'driver_id': driver_id,
            'bus_number': bus_number,
            'total_sessions': len(sessions),
            'total_alerts': sum(b['count'] for b in behaviors),
            'behavior_breakdown': {b['_id']: b['count'] for b in behaviors},
            'sessions': [
                {
                    'session_id': str(s['_id']),
                    'driver_id': s.get('driver_id'),
                    'bus_number': s.get('bus_number'),
                    'start_time': s['start_time'].isoformat(),
                    'end_time': s['end_time'].isoformat() if s.get('end_time') else None,
                    'duration_seconds': s.get('duration_seconds', 0),
                    'total_alerts': s.get('total_alerts', 0),
                    'alert_breakdown': s.get('alert_breakdown', {})
                }
                for s in sessions
            ],
            'generated_at': datetime.now().isoformat()
        }
        
        # Save report to database
        report_key = {
            'date': date.isoformat(),
            'driver_id': driver_id,
            'bus_number': bus_number
        }
        self.daily_reports_collection.update_one(
            report_key,
            {'$set': report},
            upsert=True
        )
        
        return report
    
    def get_driver_stats(self, driver_id):
        """Get statistics for a specific driver"""
        driver = self.drivers_collection.find_one({'driver_id': driver_id})
        
        if not driver:
            return {'error': 'Driver not found'}
        
        # Get recent violations
        recent_violations = list(self.behaviors_collection.find(
            {'driver_id': driver_id}
        ).sort('timestamp', -1).limit(20))
        
        # Get violation breakdown
        violation_breakdown = list(self.behaviors_collection.aggregate([
            {'$match': {'driver_id': driver_id}},
            {'$group': {'_id': '$behavior_type', 'count': {'$sum': 1}}}
        ]))
        
        return {
            'driver_info': driver,
            'recent_violations': recent_violations,
            'violation_breakdown': {v['_id']: v['count'] for v in violation_breakdown}
        }
    
    def get_bus_stats(self, bus_number):
        """Get statistics for a specific bus"""
        bus = self.buses_collection.find_one({'bus_number': bus_number})
        
        if not bus:
            return {'error': 'Bus not found'}
        
        # Get recent violations
        recent_violations = list(self.behaviors_collection.find(
            {'bus_number': bus_number}
        ).sort('timestamp', -1).limit(20))
        
        # Get violation breakdown
        violation_breakdown = list(self.behaviors_collection.aggregate([
            {'$match': {'bus_number': bus_number}},
            {'$group': {'_id': '$behavior_type', 'count': {'$sum': 1}}}
        ]))
        
        return {
            'bus_info': bus,
            'recent_violations': recent_violations,
            'violation_breakdown': {v['_id']: v['count'] for v in violation_breakdown}
        }
