"""
Route Service - Handles route validation and name resolution
"""
import logging
import httpx
from typing import Optional
from config import config

logger = logging.getLogger(__name__)


class RouteService:
    """Service for route validation and name lookup"""
    
    def __init__(self, firebase_service=None):
        self.firebase = firebase_service
        self.backend_url = config.BACKEND_API_URL
        
        # Cache for route data
        self._route_cache: dict = {}
    
    async def get_route_name(self, route_id: int | str) -> Optional[str]:
        """Get route name by route ID"""
        route_id_str = str(route_id)
        
        # Check cache first
        if route_id_str in self._route_cache:
            return self._route_cache[route_id_str].get('name')
        
        # Try Firebase first
        if self.firebase:
            route = await self.firebase.get_route_by_id(route_id)
            if route:
                self._route_cache[route_id_str] = route
                return route.get('name')
        
        # Fallback to backend API
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.backend_url}/api/routes/{route_id}",
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    route = response.json()
                    self._route_cache[route_id_str] = route
                    return route.get('name')
                    
        except Exception as e:
            logger.error(f"Error fetching route from backend: {e}")
        
        return None
    
    async def validate_route(self, route_id: int | str) -> bool:
        """Validate if route exists"""
        route_name = await self.get_route_name(route_id)
        return route_name is not None
    
    async def get_route(self, route_id: int | str) -> Optional[dict]:
        """Get full route data"""
        route_id_str = str(route_id)
        
        # Check cache first
        if route_id_str in self._route_cache:
            return self._route_cache[route_id_str]
        
        # Fetch from Firebase or backend
        if self.firebase:
            route = await self.firebase.get_route_by_id(route_id)
            if route:
                self._route_cache[route_id_str] = route
                return route
        
        return None
    
    async def get_all_routes(self) -> list:
        """Get all available routes"""
        if self.firebase:
            return await self.firebase.get_all_routes()
        
        # Fallback to backend API
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.backend_url}/api/routes",
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    return response.json()
                    
        except Exception as e:
            logger.error(f"Error fetching routes from backend: {e}")
        
        return []
    
    def clear_cache(self):
        """Clear route cache"""
        self._route_cache.clear()
        logger.info("Route cache cleared")
