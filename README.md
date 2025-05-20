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
Run the final `pip install -r requirements-dev.txt` step while your environment
still has network access (for example in a prebuild or custom container). This
ensures `pytest` and the rest of the test tooling are available even when the
workspace later runs offline.

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

### Backend – Pytest suite (🧪 new!)

Recent work added a comprehensive asynchronous test-suite for the FastAPI
backend.  The tests live in [`backend/tests`](backend/tests) and exercise both
happy-paths and error-paths across all public endpoints as well as the
OpenAI-integration helper functions.

**What’s covered**

* `test_health.py` – application & database health-check
* `test_generate_route.py` / `test_generate_route_invalid_params.py` – image
  generation endpoint (valid requests **and** 422 validation errors)
* `test_edit_route.py` – placeholder image-editing endpoint
* `test_images_route.py` – gallery listing with/without existing data
* `test_error_paths.py` – assorted negative-path scenarios (missing fields,
  internal exceptions)
* `test_openai_service.py` – unit tests for the `openai_service` helpers
* `test_config.py` – legacy `config.py` forward-compat shim

**No external dependencies**

The suite **does not talk to the real OpenAI service** – all network calls are
patched/mocked, and a dummy `OPENAI_API_KEY` is injected automatically via the
test fixtures.  You can therefore run the tests completely offline.

**Running the backend tests**

```bash
# from the repo root
cd backend

# (optional) create & activate a virtual-env first
pip install -r requirements-dev.txt
# (needs network access, so run this during the online setup phase)

# quick run
pytest -q

# run with coverage
pytest --cov=app --cov-report=term-missing

# run an individual test
pytest tests/test_generate_route.py::test_generate_image_ok
```

### Frontend

The React frontend currently has **no** automated test suite. Pull requests
adding Jest/React-Testing-Library tests are very welcome!

---

## Project Structure
```
image-gen-gallery/
├── backend/
│   ├── app/           # FastAPI app code
│   ├── local_storage/ # Created automatically at runtime for image files and SQLite DB
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
MIT 