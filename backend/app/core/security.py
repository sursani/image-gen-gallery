"""Security middleware and utilities for the application."""

from fastapi import Request
from fastapi.responses import Response
from typing import Callable


async def security_headers_middleware(request: Request, call_next: Callable) -> Response:
    """Add security headers to all responses."""
    response = await call_next(request)
    
    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Remove server header - Starlette's MutableHeaders doesn't have pop()
    if "Server" in response.headers:
        del response.headers["Server"]
    
    # Content Security Policy - adjust as needed
    csp = (
        "default-src 'self'; "
        "img-src 'self' data: blob: https:; "
        "style-src 'self' 'unsafe-inline'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "font-src 'self' data:; "
        "connect-src 'self' http://localhost:* ws://localhost:*;"
    )
    response.headers["Content-Security-Policy"] = csp
    
    # Only add HSTS in production (when HTTPS is used)
    # response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response