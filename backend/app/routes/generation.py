from fastapi import APIRouter
from .generation_routes import router

# Re-export the router from generation_routes.py
# This file serves as a compatibility layer

router = APIRouter(
    tags=["Generation"],
)

# TODO: Implement image generation endpoint
@router.post("/")
async def generate_image():
    # Placeholder for generation logic
    return {"message": "Image generation endpoint placeholder"} 