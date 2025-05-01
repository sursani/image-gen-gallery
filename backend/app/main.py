from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import ALLOWED_ORIGINS, OPENAI_API_KEY
from .routes import editing, gallery, image_routes
from .routes.generation_routes import router as generation_router
# Import storage service to trigger database initialization on startup
from .services import storage_service
from .services.image_service import initialize_database

# Initialize Database on startup
try:
    initialize_database()
except Exception as e:
    # Log the error appropriately in a real app
    print(f"ERROR: Failed to initialize database: {e}")
    # Decide if the app should exit or continue without DB

# TODO: Remove this import once OpenAI client is used elsewhere
# This is just to verify the key is loaded initially
if OPENAI_API_KEY:
    print("OpenAI API Key loaded successfully.")
else:
    print("OpenAI API Key not found. Please check your .env file.")

app = FastAPI(
    title="AI Image Generation API",
    description="API for generating and editing images using OpenAI.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
        conn = storage_service.get_db_connection() # Use storage_service temporarily
        conn.close()
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