"""FastAPI Application Entrypoint with Production CORS, Structured Errors, and Scheduler."""

import asyncio
from contextlib import asynccontextmanager
import logging
import sys
import uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.config import settings
from app.data.nse_calendar import get_now_ist
from app.data.providers.base import ProviderError
from app.engine.scanner import intraday_auto_scheduler_loop
from app.models.common import APIErrorResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage background intraday scheduler lifecycle cleanly."""
    stop_event = asyncio.Event()
    scheduler_task = None
    if settings.ENABLE_BACKGROUND_SCHEDULER:
        scheduler_task = asyncio.create_task(intraday_auto_scheduler_loop(stop_event))
        logger.info("Tradedia Analytics Backend started (scheduler active, env=%s).", settings.ENVIRONMENT)
    else:
        logger.info("Tradedia Analytics Backend started (scheduler disabled, env=%s).", settings.ENVIRONMENT)
    try:
        yield
    finally:
        stop_event.set()
        if scheduler_task is not None:
            scheduler_task.cancel()
            try:
                await scheduler_task
            except asyncio.CancelledError:
                pass
        logger.info("Tradedia Analytics Backend shut down cleanly.")


app = FastAPI(
    title="Tradedia Rule-Based NSE Stock Analytics & Walk-Forward Backtesting API",
    description=(
        "Deterministic rule-based technical stock screening, individual stock analytics, "
        "and chronological walk-forward out-of-sample backtesting engine for NSE equities. "
        "Not AI-generated research and not SEBI-registered investment advice."
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

cors_origins = settings.cors_origin_list
allow_credentials = "*" not in cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID", "X-Service-Signature", "X-Service-Timestamp", "X-User-Context"],
)


def _make_error_response(
    status_code: int,
    error_code: str,
    message: str,
    details: dict,
    request_id: str,
) -> JSONResponse:
    payload = APIErrorResponse(
        status="ERROR",
        error_code=error_code,
        message=message,
        details=details,
        timestamp_ist=get_now_ist().strftime("%Y-%m-%d %H:%M:%S IST"),
        request_id=request_id,
    )
    return JSONResponse(status_code=status_code, content=payload.model_dump())


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:12]
    if isinstance(exc.detail, dict):
        code = str(exc.detail.get("error_code", f"HTTP_{exc.status_code}"))
        msg = str(exc.detail.get("message", "Request error."))
        details = {k: v for k, v in exc.detail.items() if k not in ("error_code", "message")}
    else:
        code = f"HTTP_{exc.status_code}"
        msg = str(exc.detail)
        details = {}
    return _make_error_response(exc.status_code, code, msg, details, req_id)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:12]
    return _make_error_response(
        422,
        "VALIDATION_ERROR",
        "Request parameter validation failed.",
        {"errors": exc.errors()},
        req_id,
    )


@app.exception_handler(ProviderError)
async def provider_exception_handler(request: Request, exc: ProviderError) -> JSONResponse:
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:12]
    logger.warning("Provider error [%s]: %s", req_id, exc)
    return _make_error_response(503, "PROVIDER_UNAVAILABLE", str(exc), {}, req_id)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:12]
    logger.exception("Unhandled error [%s] on %s", req_id, request.url.path)
    return _make_error_response(
        500,
        "INTERNAL_SERVER_ERROR",
        "An unexpected internal error occurred.",
        {},
        req_id,
    )


app.include_router(router)


@app.get("/")
async def root():
    return {
        "name": "Tradedia Rule-Based NSE Stock Analytics API",
        "version": settings.APP_VERSION,
        "analysis_engine_type": "RULE_BASED_TECHNICAL_ANALYTICS",
        "docs_url": "/docs",
        "api_base": "/api/v1",
    }
