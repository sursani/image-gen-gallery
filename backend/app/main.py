from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialise logging before any other project imports that might emit logs
from .core.logging import init_logging
from .core.settings import settings

init_logging()
from .routes import editing, gallery, image_routes
from .routes.generation_routes import router as generation_router
# Async DB ping helper uses the new image_service
from .services import image_service
# ---------------------------------------------------------------------------
# Database initialisation moved to an async FastAPI startup hook so that it
# runs inside the event-loop and uses the new aiosqlite implementation without
# blocking.
# ---------------------------------------------------------------------------

# TODO: Remove this import once OpenAI client is used elsewhere
# app will be defined below; we add the startup hook after its creation.

# This is just to verify the key is loaded initially
# Informative message
if settings.openai_api_key:
    import logging

    logging.getLogger(__name__).info("OpenAI API key loaded successfully.")

app = FastAPI(
    title="AI Image Generation API",
    description="API for generating and editing images using OpenAI.",
    version="1.0.0"
)

# ---------------------------------------------------------------------------
# Startup tasks
# ---------------------------------------------------------------------------

from .services.image_service import initialize_database


@app.on_event("startup")
async def _startup_db() -> None:
    """Initialise the SQLite schema without blocking the event loop."""

    try:
        await initialize_database()
    except Exception as e:
        # Fail fast if we cannot prepare storage – otherwise requests will
        # throw 500s later.
        print(f"ERROR: Failed to initialize database: {e}")
        raise

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], # Expand allowed methods if needed
    allow_headers=["*"], # Allow all headers
)

@app.get("/", tags=["Health"])
async def root():
    return {"message": "Welcome to the AI Image Generation API"}

@app.get("/health", tags=["Health"])
async def health_check():
    """Perform a health check."""
    # In the future, this could check database connections, API key validity, etc.
    # Simple DB check example (could be more robust)
    try:
        # Cheap async check: try to fetch a single row; this hits the DB via a
        # background thread and returns quickly even if the table is empty.
        await image_service.get_all_image_metadata(limit=1)
        db_status = "OK"
    except Exception as e:
        db_status = f"Error: {e}"
        
    return {"status": "OK", "database": db_status}

# Add routers for image generation, editing, and gallery
app.include_router(generation_router, prefix="/api/generate", tags=["Generation"])
app.include_router(editing.router, prefix="/api/edit", tags=["Editing"])
# app.include_router(gallery.router, prefix="/api/gallery", tags=["Gallery"])

# Add the new image metadata router
app.include_router(
    image_routes.router,
    prefix="/api/images",
    tags=["Images"]
)

# Placeholder for the direct image file serving endpoint (part 2 of Task 5)
# This might be better handled separately or using StaticFiles depending on scale
# @app.get("/images/{image_id}")
# async def get_image_file(image_id: str):
#     # Logic to find filename from DB using image_id
#     # Return FileResponse
#     pass

# Remove previous conflicting imports if they exist
# from .routes import generation
# from .routes import editing
# from .routes import gallery
# from .services import storage_service 