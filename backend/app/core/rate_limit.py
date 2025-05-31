"""Rate limiting implementation for API endpoints."""

from datetime import datetime, timedelta
from typing import Dict, Tuple
from fastapi import HTTPException, Request
from collections import defaultdict
import asyncio
from functools import wraps


class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self):
        self.requests: Dict[str, list[datetime]] = defaultdict(list)
        self.lock = asyncio.Lock()
        
    async def check_rate_limit(
        self, 
        identifier: str, 
        max_requests: int, 
        window_seconds: int
    ) -> bool:
        """
        Check if the request should be allowed based on rate limit.
        
        Args:
            identifier: Unique identifier for the client (IP address)
            max_requests: Maximum number of requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            True if request is allowed, False otherwise
        """
        async with self.lock:
            now = datetime.now()
            window_start = now - timedelta(seconds=window_seconds)
            
            # Clean up old requests
            self.requests[identifier] = [
                req_time for req_time in self.requests[identifier]
                if req_time > window_start
            ]
            
            # Check if limit exceeded
            if len(self.requests[identifier]) >= max_requests:
                return False
            
            # Add current request
            self.requests[identifier].append(now)
            return True
    
    async def cleanup_old_entries(self, older_than_seconds: int = 3600):
        """Remove entries older than specified seconds."""
        async with self.lock:
            cutoff = datetime.now() - timedelta(seconds=older_than_seconds)
            identifiers_to_remove = []
            
            for identifier, timestamps in self.requests.items():
                # Remove old timestamps
                self.requests[identifier] = [
                    ts for ts in timestamps if ts > cutoff
                ]
                # Mark empty entries for removal
                if not self.requests[identifier]:
                    identifiers_to_remove.append(identifier)
            
            # Remove empty entries
            for identifier in identifiers_to_remove:
                del self.requests[identifier]


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_requests: int = 10, window_seconds: int = 60):
    """
    Decorator to apply rate limiting to endpoints.
    
    Args:
        max_requests: Maximum requests allowed in the window
        window_seconds: Time window in seconds
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Use client IP as identifier
            client_ip = request.client.host if request.client else "unknown"
            
            # Check rate limit
            allowed = await rate_limiter.check_rate_limit(
                identifier=client_ip,
                max_requests=max_requests,
                window_seconds=window_seconds
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Maximum {max_requests} requests per {window_seconds} seconds."
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator


# Background task to clean up old entries periodically
async def periodic_cleanup():
    """Run periodic cleanup of old rate limit entries."""
    while True:
        await asyncio.sleep(3600)  # Run every hour
        await rate_limiter.cleanup_old_entries()