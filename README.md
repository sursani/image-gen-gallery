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

The project keeps **runtime** and **development** Python requirements separate:

* `backend/requirements.txt` – packages strictly needed at runtime (FastAPI,
  Uvicorn, OpenAI SDK, etc.).  Use this in production images or minimal cloud
  deployments.
* `backend/requirements-dev.txt` – pulls in *all* runtime packages **plus** the
  testing / linting tool-chain.  A `-r requirements.txt` line at the top keeps
  the files DRY.

Typical local-development workflow:

```bash
cd backend

# One-time env creation
python3 -m venv venv
source venv/bin/activate

# Installs runtime deps *and* pytest/coverage/mocking tooling
pip install -r requirements-dev.txt

# After that you can work completely offline
```
Run the installation while you still have internet access (e.g. CI pre-build)
so that future test runs don’t need the network.

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

### Backend – Pytest suite (🧪 comprehensive & offline-friendly)

More than **60** asynchronous tests live in [`backend/tests`](backend/tests)
covering:

• Public API routes (generate, edit, images gallery, file download, health)
• OpenAI integration helpers (generate / edit, retry & error logic)
• SQLite persistence layer & storage_service fall-backs
• Pydantic validators and application start-up hooks

Current coverage target is **≥ 90 %** for core application code.  The suite is
completely self-contained – all outbound HTTP / OpenAI calls are mocked and a
temporary filesystem is used, so **no network access or real API keys are
required**.

#### Running backend tests

```bash
# From the repo root
cd backend

# 1) Create & activate a virtual-env **once** (if you haven’t already)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt   # pulls runtime deps automatically

# 2) Subsequent test runs (offline)
venv/bin/pytest -q                           # fast run
venv/bin/pytest --cov=app --cov-report=term  # with coverage breakdown

# 3) Single test example
venv/bin/pytest tests/test_generate_route.py::test_generate_image_ok
```

### Frontend – Node built-in runner (👟 lightweight & offline)

Frontend logic tests live in `frontend/src/__tests__/` and use Node’s
`node:test` framework together with the standard `assert` module.  They focus
on the **API helper modules** (`fetchImageMetadata`, `generateImage`,
`editImage`) and other non-DOM utilities.  External calls are stubbed so the
suite runs completely offline.

Run them with:

#### Running frontend tests

```bash
cd frontend

# Basic test run
npm test                                              # shortcut for: node --test

# With coverage report (experimental Node.js feature)
node --test --experimental-test-coverage             # shows coverage breakdown
```

**Current test coverage:** ~77% overall with good coverage of core API modules.

Because Node can’t parse React **TSX** files without a build step we currently
don’t unit-test individual components.  Integration/UI coverage will be added
in a future migration to a dedicated component test runner.

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