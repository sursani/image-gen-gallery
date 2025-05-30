#!/usr/bin/env python3
"""
Utility script to clear the database and image files for a fresh start.
Run this from the backend directory: python scripts/clear_database.py
"""

import os
import sqlite3
import shutil
from pathlib import Path

# Import settings to get the correct paths
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.core.settings import settings

def clear_database_and_images():
    """Clear all database records and image files."""
    
    # Get paths
    storage_dir = Path(settings.storage_dir)
    db_path = storage_dir / settings.db_filename
    images_dir = storage_dir / "images"
    
    print(f"Storage directory: {storage_dir}")
    print(f"Database path: {db_path}")
    print(f"Images directory: {images_dir}")
    
    # Clear database records
    if db_path.exists():
        try:
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # Get count before clearing
            cursor.execute("SELECT COUNT(*) FROM image_metadata")
            count_before = cursor.fetchone()[0]
            print(f"Found {count_before} records in database")
            
            # Clear all records
            cursor.execute("DELETE FROM image_metadata")
            conn.commit()
            
            # Verify clearing
            cursor.execute("SELECT COUNT(*) FROM image_metadata")
            count_after = cursor.fetchone()[0]
            print(f"Database cleared. Records remaining: {count_after}")
            
            conn.close()
            
        except sqlite3.Error as e:
            print(f"Error clearing database: {e}")
            return False
    else:
        print("Database file does not exist")
    
    # Clear image files
    if images_dir.exists():
        try:
            # Count files before clearing
            image_files = list(images_dir.glob("*"))
            file_count = len(image_files)
            print(f"Found {file_count} image files")
            
            # Remove all files in images directory
            for file_path in image_files:
                if file_path.is_file():
                    file_path.unlink()
                    
            print("All image files cleared")
            
        except OSError as e:
            print(f"Error clearing image files: {e}")
            return False
    else:
        print("Images directory does not exist")
    
    print("✅ Database and images cleared successfully!")
    return True

if __name__ == "__main__":
    print("🧹 Clearing database and image files...")
    print("=" * 50)
    
    success = clear_database_and_images()
    
    if success:
        print("=" * 50)
        print("✅ Fresh start ready!")
    else:
        print("=" * 50)
        print("❌ Some errors occurred during clearing")
        sys.exit(1) 