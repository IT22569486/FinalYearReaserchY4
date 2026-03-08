"""
Socket.IO Service - Handles real-time WebSocket communication
"""
import socketio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class SocketService:
    """Socket.IO server for real-time bus tracking updates"""
    
    def __init__(self, cors_origins: str = '*'):
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins=cors_origins.split(',') if cors_origins != '*' else '*',
            logger=False,
            engineio_logger=False
        )
        
        self._setup_handlers()
        
    def _setup_handlers(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        async def connect(sid, environ):
            logger.info(f"Client connected: {sid}")
            await self.sio.emit('connected', {'status': 'connected', 'sid': sid}, to=sid)
        
        @self.sio.event
        async def disconnect(sid):
            logger.info(f"Client disconnected: {sid}")
        
        @self.sio.event
        async def subscribe_bus(sid, data):
            """Client subscribes to specific bus updates"""
            bus_id = data.get('bus_id')
            if bus_id:
                room = f"bus_{bus_id}"
                self.sio.enter_room(sid, room)
                logger.info(f"Client {sid} subscribed to bus {bus_id}")
                await self.sio.emit('subscribed', {'bus_id': bus_id}, to=sid)
        
        @self.sio.event
        async def unsubscribe_bus(sid, data):
            """Client unsubscribes from bus updates"""
            bus_id = data.get('bus_id')
            if bus_id:
                room = f"bus_{bus_id}"
                self.sio.leave_room(sid, room)
                logger.info(f"Client {sid} unsubscribed from bus {bus_id}")
        
        @self.sio.event
        async def subscribe_all_buses(sid):
            """Client subscribes to all bus updates"""
            self.sio.enter_room(sid, 'all_buses')
            logger.info(f"Client {sid} subscribed to all buses")
            await self.sio.emit('subscribed_all', {'status': 'ok'}, to=sid)
        
        @self.sio.event
        async def ping(sid, data):
            """Handle ping from client"""
            await self.sio.emit('pong', {'timestamp': datetime.utcnow().isoformat()}, to=sid)
    
    async def emit_bus_location(self, bus_data: dict):
        """Emit bus location update to all clients"""
        try:
            bus_id = bus_data.get('bus_id')
            
            # Emit to specific bus room
            if bus_id:
                await self.sio.emit(
                    'bus_location_update',
                    bus_data,
                    room=f"bus_{bus_id}"
                )
            
            # Also emit to 'all_buses' room
            await self.sio.emit(
                'bus_location_update',
                bus_data,
                room='all_buses'
            )
            
            # Broadcast to all connected clients
            await self.sio.emit('bus_location_update', bus_data)
            
            logger.debug(f"Emitted location update for bus {bus_id}")
            
        except Exception as e:
            logger.error(f"Error emitting bus location: {e}")
    
    async def emit_passenger_update(self, passenger_data: dict):
        """Emit passenger update to all clients"""
        try:
            bus_id = passenger_data.get('bus_id')
            
            # Emit to specific bus room
            if bus_id:
                await self.sio.emit(
                    'passenger_update',
                    passenger_data,
                    room=f"bus_{bus_id}"
                )
            
            # Also emit to 'all_buses' room
            await self.sio.emit(
                'passenger_update',
                passenger_data,
                room='all_buses'
            )
            
            # Broadcast to all connected clients
            await self.sio.emit('passenger_update', passenger_data)
            
            logger.debug(f"Emitted passenger update for bus {bus_id}")
            
        except Exception as e:
            logger.error(f"Error emitting passenger update: {e}")
    
    async def emit_bus_status(self, bus_id: str, status: str):
        """Emit bus status change (online/offline)"""
        try:
            data = {
                'bus_id': bus_id,
                'status': status,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            await self.sio.emit('bus_status', data, room='all_buses')
            await self.sio.emit('bus_status', data)
            
            logger.info(f"Emitted status update: Bus {bus_id} is {status}")
            
        except Exception as e:
            logger.error(f"Error emitting bus status: {e}")
    
    def get_app(self):
        """Get ASGI app for mounting"""
        return socketio.ASGIApp(self.sio)
