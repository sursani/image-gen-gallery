import sqlite3
from typing import List, Optional, Literal
from pydantic import ValidationError
import logging
from ..models.image_metadata import ImageMetadata

DATABASE_PATH = "local_storage/image_metadata.db"

logger = logging.getLogger(__name__)

SortOrder = Literal["newest", "oldest"]

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row  # Return rows as dictionary-like objects
        return conn
    except sqlite3.Error as e:
        logger.error(f"Database connection error: {e}")
        raise

def get_all_image_metadata(
    limit: int = 10, offset: int = 0, sort: SortOrder = "newest"
) -> List[ImageMetadata]:
    """
    Retrieves a paginated and sorted list of image metadata from the database.

    Args:
        limit: Maximum number of records to return.
        offset: Number of records to skip (for pagination).
        sort: Sorting order ('newest' or 'oldest').

    Returns:
        A list of ImageMetadata objects.
        Returns an empty list if no records are found or an error occurs.
    """
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        order_clause = "DESC" if sort == "newest" else "ASC"
        query = f"""
            SELECT id, prompt, parameters, filename, timestamp
            FROM image_metadata
            ORDER BY timestamp {order_clause}
            LIMIT ? OFFSET ?
        """
        cursor.execute(query, (limit, offset))
        rows = cursor.fetchall()

        metadata_list = []
        for row in rows:
            try:
                # Pydantic expects 'parameters' to be a dict/str, but SQLite might return string
                # or None. Handle potential JSON loading if stored as string.
                params = row['parameters']
                # Basic check, assumes JSON string if it starts with { or [
                # A more robust solution might be needed depending on how parameters are stored
                if isinstance(params, str) and (params.startswith('{') or params.startswith('[')):
                    import json
                    try:
                        params = json.loads(params)
                    except json.JSONDecodeError:
                        logger.warning(f"Could not decode parameters JSON for image {row['id']}: {params}")
                        # Keep as string if decode fails, or set to None/dict based on requirements
                
                metadata_data = dict(row)
                metadata_data['parameters'] = params # Assign potentially converted params
                
                metadata = ImageMetadata(**metadata_data)
                metadata_list.append(metadata)
            except ValidationError as e:
                logger.error(f"Data validation error for row {dict(row)}: {e}")
            except Exception as e:
                logger.error(f"Error processing row {dict(row)}: {e}")


        return metadata_list

    except sqlite3.Error as e:
        logger.error(f"Database query error in get_all_image_metadata: {e}")
        # Depending on requirements, could re-raise or return empty list
        return []
    except Exception as e:
        logger.error(f"Unexpected error in get_all_image_metadata: {e}")
        return [] # Return empty list on unexpected errors
    finally:
        if conn:
            conn.close()

def get_image_filename_by_id(image_id: str) -> Optional[str]:
    """Retrieves the filename for a given image ID from the database."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = "SELECT filename FROM image_metadata WHERE id = ?"
        cursor.execute(query, (image_id,))
        row = cursor.fetchone()
        if row:
            return row['filename']
        else:
            logger.warning(f"Image ID not found in database: {image_id}")
            return None
    except sqlite3.Error as e:
        logger.error(f"Database query error fetching filename for ID {image_id}: {e}")
        return None # Return None on database error
    except Exception as e:
        logger.error(f"Unexpected error fetching filename for ID {image_id}: {e}")
        return None
    finally:
        if conn:
            conn.close()

# Example placeholder for saving metadata (from Task 2, might need refinement)
def save_image_metadata(metadata: ImageMetadata):
    """Saves image metadata to the database."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Ensure parameters are stored appropriately (e.g., as JSON string)
        params_to_store = metadata.parameters
        if isinstance(params_to_store, dict):
            import json
            params_to_store = json.dumps(params_to_store)
            
        query = """
            INSERT INTO image_metadata (id, prompt, parameters, filename, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """
        cursor.execute(query, (
            metadata.id,
            metadata.prompt,
            params_to_store,
            metadata.filename,
            metadata.timestamp.isoformat() # Store timestamp as ISO string
        ))
        conn.commit()
        logger.info(f"Saved metadata for image {metadata.id}")
        return metadata.id
    except sqlite3.Error as e:
        logger.error(f"Database error saving metadata for {metadata.id}: {e}")
        conn.rollback() # Roll back changes on error
        raise # Re-raise the exception to signal failure
    except Exception as e:
        logger.error(f"Unexpected error saving metadata: {e}")
        if conn:
             conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

# Placeholder for database initialization (from Task 2)
def initialize_database():
    """Initializes the SQLite database and creates the table if it doesn't exist."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS image_metadata (
                id TEXT PRIMARY KEY,
                prompt TEXT NOT NULL,
                parameters TEXT,
                filename TEXT NOT NULL UNIQUE,
                timestamp DATETIME NOT NULL
            )
        """)
        conn.commit()
        logger.info("Database initialized successfully.")
    except sqlite3.Error as e:
        logger.error(f"Database initialization error: {e}")
        raise
    finally:
        if conn:
            conn.close() 