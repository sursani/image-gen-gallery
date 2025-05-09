# Image Generation Gallery

A full-stack application for generating, editing, and managing AI-generated images using OpenAI's API. The project features a FastAPI backend and a modern React (Vite + Tailwind) frontend.

---

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Backend (FastAPI)](#backend-fastapi)
- [Frontend (React + Vite)](#frontend-react--vite)
- [Environment Variables](#environment-variables)
- [Development Setup](#development-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

---

## Features
- Generate images using OpenAI's image models
- Edit images with prompt-based modifications
- View and manage a gallery of generated images
- Store image metadata in SQLite
- Modern, responsive frontend UI

---

## Architecture
- **Backend:** FastAPI, OpenAI API, SQLite, Pydantic, CORS
- **Frontend:** React 19, Vite, Tailwind CSS, Axios
- **Storage:** Local file storage for images, SQLite for metadata

---

## Backend (FastAPI)
- Located in [`backend/app`](backend/app)
- Exposes REST API endpoints for image generation, editing, gallery, and health checks
- Uses OpenAI API for image generation
- Stores image metadata in SQLite (file: `backend/local_storage/image_metadata.db`)
- Configurable via environment variables (see below)

### Install dependencies
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # for development/testing
```

### Run the backend server
```bash
# From the backend directory
uvicorn app.main:app --reload
```
- The API will be available at `http://localhost:8000`

---

## Frontend (React + Vite)
- Located in [`frontend`](frontend)
- Built with React 19, Vite, and Tailwind CSS
- Communicates with the backend via REST API

### Install dependencies
```bash
cd frontend
npm install
```

### Run the frontend dev server
```bash
npm run dev
```
- The app will be available at `http://localhost:5173` (or as shown in the terminal)

---

## Environment Variables

Create a `.env` file in the project root (or backend root) with the following variables:

```
OPENAI_API_KEY=your-openai-api-key
IMAGE_MODEL=gpt-image-1
STORAGE_DIR=backend/local_storage
DB_FILENAME=image_metadata.db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=INFO
LOG_FORMAT=plain
```
- See [`backend/app/core/settings.py`](backend/app/core/settings.py) for all options.
- The backend loads `.env` automatically.

---

## Development Setup
- Use Python 3.12+
- Use Node.js 18+ for the frontend
- Recommended: run backend and frontend in separate terminals for development
- Backend hot-reloads with `--reload`; frontend with Vite HMR

---

## Running the Application
1. **Start the backend:**
    ```bash
    cd backend
    uvicorn app.main:app --reload
    ```
2. **Start the frontend:**
    ```bash
    cd frontend
    npm run dev
    ```
3. Open your browser to `http://localhost:5173` to use the app.

---

## Testing
- **Backend:**
    ```bash
    cd backend
    pytest --cov=app --cov-report=term-missing
    ```
- **Frontend:**
    - Add tests as needed (e.g., with Jest, React Testing Library)

---

## Project Structure
```
image-gen-gallery/
├── backend/
│   ├── app/           # FastAPI app code
│   ├── local_storage/ # Image files and SQLite DB
│   ├── tests/         # Pytest tests
│   └── requirements.txt
├── frontend/
│   ├── src/           # React app code
│   ├── public/
│   └── package.json
├── .env.example       # Example environment file
└── README.md
```

---

## Contributing
- Fork the repo and create a feature branch
- Follow code style and linting rules
- Add/maintain tests for new features
- Open a pull request with a clear description

---

## License
MIT (or specify your license here) 