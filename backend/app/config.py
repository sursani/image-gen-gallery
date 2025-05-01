import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    print("Warning: OPENAI_API_KEY environment variable not set.")
    # You might want to raise an exception here in a real application
    # raise ValueError("OPENAI_API_KEY environment variable not set.")

# You can add other configurations here, e.g., database URLs, CORS origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Assuming React frontend runs on port 3000
    "http://localhost:5173", # Default Vite port
    # Add other origins as needed (e.g., your deployed frontend URL)
] 