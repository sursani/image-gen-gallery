from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class ImageMetadata(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    prompt: str
    # Store parameters as a simple string or dict for flexibility
    # Adjust if specific known parameters need strong typing
    parameters: dict | str | None = None
    filename: str # Relative path within the storage directory
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        # Example for potential ORM integration later, not strictly needed for SQLite
        # orm_mode = True # Pydantic v1
        from_attributes = True # Pydantic v2 