from fastapi import APIRouter

router = APIRouter(
    prefix="/gallery",
    tags=["Gallery"],
)

# TODO: Implement get all images endpoint
@router.get("/")
async def get_gallery_images():
    # Placeholder for gallery logic
    return {"message": "Image gallery endpoint placeholder", "images": []}

# TODO: Implement get specific image file endpoint
# Need to decide how to serve files (StaticFiles or StreamingResponse)
# @router.get("/{image_id}")
# async def get_image_file(image_id: str):
#     return {"message": f"Serving image {image_id}"} 