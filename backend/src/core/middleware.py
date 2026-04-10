import time
import uuid
import logging
import json
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable

# Configure basic logging to stdout
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_therapist_middleware")

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 1. Extract or generate Correlation ID
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        
        # 2. Add to request state for downstream use (logging, dependencies)
        request.state.correlation_id = correlation_id
        
        # 3. Process the request
        response = await call_next(request)
        
        # 4. Inject Correlation ID back into response headers for the client
        response.headers["X-Correlation-ID"] = correlation_id
        return response

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        correlation_id = getattr(request.state, "correlation_id", "unknown")
        
        # Log request start
        logger.info(json.dumps({
            "event": "request_started",
            "method": request.method,
            "path": request.url.path,
            "correlation_id": correlation_id,
            "client_ip": request.client.host if request.client else "unknown"
        }))
        
        try:
            response = await call_next(request)
            duration = time.perf_counter() - start_time
            
            # Log request completion
            logger.info(json.dumps({
                "event": "request_completed",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
                "correlation_id": correlation_id
            }))
            return response
            
        except Exception as e:
            duration = time.perf_counter() - start_time
            logger.error(json.dumps({
                "event": "request_failed",
                "method": request.method,
                "path": request.url.path,
                "error": str(e),
                "duration_ms": round(duration * 1000, 2),
                "correlation_id": correlation_id
            }))
            raise e

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Placeholder Rate Limiter. 
    In production, this should be replaced with a Redis-backed slowapi implementation.
    """
    # Simplified memory-based counter (resetting every minute - not production ready but protective)
    counts = {}
    last_reset = time.time()
    requests_per_minute = 200

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        now = time.time()
        if now - self.last_reset > 60:
            self.counts.clear()
            self.last_reset = now
            
        client_ip = request.client.host if request.client else "127.0.0.1"
        current_count = self.counts.get(client_ip, 0)
        
        if current_count >= self.requests_per_minute:
            logger.warning(json.dumps({
                "event": "rate_limit_exceeded",
                "client_ip": client_ip,
                "correlation_id": getattr(request.state, "correlation_id", "unknown")
            }))
            return Response(
                content=json.dumps({"detail": "Rate limit exceeded. Please try again later."}),
                status_code=429,
                media_type="application/json"
            )
            
        self.counts[client_ip] = current_count + 1
        return await call_next(request)
