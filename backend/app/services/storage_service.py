import sqlite3
import os
import aiofiles # For async file operations
import json
from datetime import datetime
from ..models.image_metadata import ImageMetadata
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define paths relative to this file's location (services directory)
# Go up two levels to the backend directory, then down to local_storage
STORAGE_DIR = Path(__file__).parent.parent.parent / "local_storage"
IMAGE_DIR = STORAGE_DIR / "images"
DATABASE_PATH = STORAGE_DIR / "metadata.db"

# Ensure storage directories exist
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

def _get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row # Return rows as dict-like objects
    return conn

def initialize_database():
    """Creates the metadata table if it doesn't exist."""
    try:
        conn = _get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS image_metadata (
                id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                parameters TEXT, -- Store dict/complex data as JSON string
                filename TEXT NOT NULL UNIQUE,
                timestamp TEXT NOT NULL
            )
        ''')
        conn.commit()
        logger.info("Database initialized successfully.")
    except sqlite3.Error as e:
        logger.error(f"Database error during initialization: {e}")
    finally:
        if conn:
            conn.close()

async def save_image_and_metadata(prompt: str, parameters: dict | str | None, image_data: bytes, original_filename: str) -> ImageMetadata | None:
    """Saves image data to disk and its metadata to the database."""
    
    # Generate a unique filename to avoid collisions
    file_extension = Path(original_filename).suffix or '.png' # Default to png if no extension
    new_metadata = ImageMetadata(prompt=prompt, parameters=parameters, filename="") # Filename set later
    unique_filename = f"{new_metadata.id}{file_extension}"
    image_path = IMAGE_DIR / unique_filename
    new_metadata.filename = unique_filename # Update metadata with the actual filename

    conn = None
    try:
        # 1. Save image file asynchronously
        async with aiofiles.open(image_path, 'wb') as f:
            await f.write(image_data)
        logger.info(f"Image saved successfully to {image_path}")

        # 2. Save metadata to database
        conn = _get_db_connection()
        cursor = conn.cursor()
        
        # Convert parameters dict to JSON string if necessary
        params_str = json.dumps(parameters) if isinstance(parameters, dict) else parameters
        
        cursor.execute('''
            INSERT INTO image_metadata (id, prompt, parameters, filename, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            new_metadata.id,
            new_metadata.prompt,
            params_str,
            new_metadata.filename,
            new_metadata.timestamp.isoformat()
        ))
        conn.commit()
        logger.info(f"Metadata saved for image ID: {new_metadata.id}")
        return new_metadata

    except (IOError, aiofiles.os.AiofilesOSError) as e:
        logger.error(f"Error saving image file {unique_filename}: {e}")
        # Attempt to clean up if file was partially created (optional)
        if image_path.exists():
            try:
                os.remove(image_path)
                logger.info(f"Cleaned up partially saved file: {image_path}")
            except OSError as cleanup_e:
                logger.error(f"Error cleaning up file {image_path}: {cleanup_e}")
        return None # Indicate failure
    except sqlite3.Error as e:
        logger.error(f"Database error saving metadata for {unique_filename}: {e}")
        # If DB write failed after image saved, attempt to delete the orphaned image file
        if image_path.exists():
            try:
                os.remove(image_path)
                logger.warning(f"DB error occurred. Deleting orphaned image file: {image_path}")
            except OSError as cleanup_e:
                logger.error(f"Error cleaning up orphaned file {image_path} after DB error: {cleanup_e}")
        return None # Indicate failure
    except Exception as e:
        logger.error(f"An unexpected error occurred during save: {e}")
        # Generic cleanup attempt
        if image_path.exists():
             try: os.remove(image_path)
             except Exception: pass
        return None
    finally:
        if conn:
            conn.close()


def get_all_metadata() -> list[ImageMetadata]:
    """Retrieves metadata for all images."""
    conn = None
    try:
        conn = _get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM image_metadata ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        
        metadata_list = []
        for row in rows:
            params = row['parameters']
            try:
                # Attempt to parse parameters back into a dict if stored as JSON
                params_data = json.loads(params) if params and params.startswith('{') else params
            except json.JSONDecodeError:
                params_data = params # Keep as string if not valid JSON
                
            metadata_list.append(ImageMetadata(
                id=row['id'],
                prompt=row['prompt'],
                parameters=params_data,
                filename=row['filename'],
                timestamp=datetime.fromisoformat(row['timestamp'])
            ))
        return metadata_list
    except sqlite3.Error as e:
        logger.error(f"Database error retrieving all metadata: {e}")
        return []
    finally:
        if conn:
            conn.close()

def get_metadata_by_id(image_id: str) -> ImageMetadata | None:
    """Retrieves metadata for a specific image by its ID."""
    conn = None
    try:
        conn = _get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM image_metadata WHERE id = ?", (image_id,))
        row = cursor.fetchone()
        if row:
            params = row['parameters']
            try:
                params_data = json.loads(params) if params and params.startswith('{') else params
            except json.JSONDecodeError:
                params_data = params
                
            return ImageMetadata(
                id=row['id'],
                prompt=row['prompt'],
                parameters=params_data,
                filename=row['filename'],
                timestamp=datetime.fromisoformat(row['timestamp'])
            )
        return None
    except sqlite3.Error as e:
        logger.error(f"Database error retrieving metadata for ID {image_id}: {e}")
        return None
    finally:
        if conn:
            conn.close()

def get_image_path(filename: str) -> Path | None:
    """Returns the full path to an image file if it exists."""
    path = IMAGE_DIR / filename
    if path.is_file():
        return path
    logger.warning(f"Image file not found at path: {path}")
    return None

# Initialize the database when the service module is loaded
initialize_database() 