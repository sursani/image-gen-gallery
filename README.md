# 🎨 AI Image Generation Gallery

A full-stack application for generating, editing, and managing AI-generated images using OpenAI's API. Built with FastAPI backend and modern React frontend with real-time streaming capabilities.

![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Coverage Backend](https://img.shields.io/badge/Backend%20Coverage-79%25-green.svg)
![Coverage Frontend](https://img.shields.io/badge/Frontend%20Coverage-91%25-brightgreen.svg)

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/image-gen-gallery.git
cd image-gen-gallery

# Set up environment
cp .env.example .env
# Edit .env with your OpenAI API key

# Run setup script (installs all dependencies)
./scripts/setup_env.sh

# Start the backend (in one terminal)
cd backend
source venv/bin/activate  # or .venv/bin/activate
uvicorn app.main:app --reload

# Start the frontend (in another terminal)
cd frontend
npm run dev
```

Visit `http://localhost:5173` to start generating images!

---

## ✨ Features

- **🖼️ Image Generation**: Generate images using OpenAI's Responses API (gpt-4o)
- **✏️ Image Editing**: Edit existing images with prompt-based modifications
- **📡 Real-time Streaming**: Stream generation progress via Server-Sent Events (SSE)
- **🖼️ Gallery Management**: View, search, and manage generated images
- **💾 Persistent Storage**: SQLite database for metadata, local file storage for images
- **🎨 Modern UI**: Responsive design with Tailwind CSS and dark theme
- **🧪 Comprehensive Testing**: 83% backend coverage, extensive frontend tests
- **🔒 Security**: Security headers, CORS configuration, input validation

---

## 🏗️ Architecture

### Technology Stack

**Backend:**
- **Framework**: FastAPI 0.100+
- **AI Integration**: OpenAI Responses API (gpt-4o model)
- **Database**: SQLite with aiosqlite for async operations
- **Validation**: Pydantic v2 for request/response validation
- **Testing**: Pytest with async support
- **Security**: CORS, security headers, input validation

**Frontend:**
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with custom dark theme
- **HTTP Client**: Axios with retry logic
- **Testing**: Vitest with React Testing Library
- **State Management**: React hooks and context

### API Architecture

The application follows a RESTful API design with streaming capabilities:

```
/api/generate/stream     POST   Stream image generation
/api/edit/stream        POST   Stream image editing
/api/images             GET    Get gallery images
/api/images/{id}        GET    Get specific image
/api/image/{filename}   GET    Get image file
/health                 GET    Health check
```

---

## 🔧 Development Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- Git
- OpenAI API key

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For development
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Environment Configuration

Create a `.env` file in the project root:

```env
# Required
OPENAI_API_KEY=your-openai-api-key

# Optional (with defaults)
IMAGE_MODEL=gpt-image-1
STORAGE_DIR=backend/local_storage
DB_FILENAME=image_metadata.db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=INFO
LOG_FORMAT=plain
```

---

## 🧪 Testing

### Running All Tests

To run both backend and frontend tests with coverage:

```bash
# From project root - run both test suites
cd backend && python -m pytest --cov=app --cov-report=html --cov-report=term-missing -v
cd ../frontend && npm test
```

### Backend Testing

The backend has comprehensive test coverage (79%) with async test support:

```bash
cd backend

# Activate virtual environment first
source venv/bin/activate  # or .venv/bin/activate on some systems

# Run all tests with coverage
python -m pytest --cov=app --cov-report=html --cov-report=term-missing -v

# Run tests quietly (less verbose)
python -m pytest -q

# Run specific test file
python -m pytest tests/test_generation_routes.py -v

# Run specific test
python -m pytest tests/test_generation_routes.py::test_generate_image_stream_ok -v

# Run tests in parallel (if pytest-xdist installed)
python -m pytest -n auto
```

**Coverage Report Locations:**
- Terminal output: Shows missed lines
- HTML report: `backend/htmlcov/index.html` (open in browser)

**Test Coverage Areas (66 tests):**
- ✅ All API endpoints (generation, editing, gallery, health)
- ✅ Input validation and error handling  
- ✅ OpenAI service integration (mocked)
- ✅ Database operations
- ✅ Streaming responses
- ✅ File upload/download
- ✅ Security and CORS

### Frontend Testing

The frontend has excellent test coverage (91.07%) exceeding all thresholds:

```bash
cd frontend

# Run all tests with coverage (coverage is enabled by default in vitest.config.ts)
npm test

# Run tests in watch mode for development
npm run test:watch

# Run tests with UI (if available)
npm run test:ui
```

**Coverage Thresholds (all exceeded ✅):**
- Lines: 91.07% (target: 80%)
- Functions: 87.5% (target: 80%)
- Branches: 89.62% (target: 70%)
- Statements: 91.07% (target: 80%)

**Coverage Report Locations:**
- Terminal output: Shows coverage summary
- HTML report: `frontend/coverage/index.html` (open in browser)

**Test Coverage Areas (193 tests across 28 files):**
- ✅ Component rendering and interactions
- ✅ API client and error handling
- ✅ Form validation and user input
- ✅ Custom hooks and utilities
- ✅ Streaming functionality (SSE)
- ✅ Image upload and processing
- ✅ Error boundaries and edge cases

---

## 🔒 Security

### Implemented Security Measures

1. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Content-Security-Policy configured
   - Referrer-Policy: strict-origin-when-cross-origin

2. **Input Validation**
   - File type validation (PNG, JPEG, WebP only)
   - File size limits (4MB max)
   - Path traversal protection
   - SQL injection prevention (parameterized queries)

3. **CORS Configuration**
   - Specific origin allowlist
   - Credentials support with strict origins
   - Limited allowed headers

### Security Recommendations

⚠️ **Before deploying to production:**

1. **Add Authentication**: Implement JWT or OAuth2
2. **Add Rate Limiting**: Use slowapi or Redis-based solution
3. **Use HTTPS**: Configure SSL/TLS certificates
4. **Rotate Secrets**: Use environment variables, never commit secrets
5. **Add Monitoring**: Implement logging and alerting
6. **Regular Updates**: Keep dependencies updated

---

## 📚 API Documentation

### Generate Image (Streaming)

```http
POST /api/generate/stream
Content-Type: application/json

{
  "prompt": "A beautiful sunset over mountains",
  "size": "1024x1024",
  "quality": "auto"
}
```

**Response**: Server-Sent Events stream
```
data: {"type": "progress", "data": {"status": "started"}}
data: {"type": "progress", "data": {"status": "generating"}}
data: {"type": "partial_image", "data": "base64..."}
data: {"type": "image", "data": "base64..."}
```

### Edit Image (Streaming)

```http
POST /api/edit/stream
Content-Type: multipart/form-data

prompt: "Make the sky purple"
image: <image file>
mask: <optional mask file>
size: "1024x1024"
```

### Get Gallery Images

```http
GET /api/images?limit=12&offset=0&sort=newest
```

**Response**:
```json
{
  "images": [
    {
      "id": "uuid",
      "prompt": "Image prompt",
      "filename": "image.png",
      "timestamp": "2024-01-01T00:00:00Z",
      "parameters": {...}
    }
  ],
  "total": 100,
  "offset": 0,
  "limit": 12
}
```

---

## 🚀 Deployment

### Docker Deployment (Recommended)

```dockerfile
# Dockerfile example (to be created)
FROM python:3.12-slim
# ... (deployment configuration needed)
```

### Manual Deployment

1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm run build
   # Serve dist/ folder with nginx or similar
   ```

3. **Environment**:
   - Use environment variables for configuration
   - Set up reverse proxy (nginx)
   - Configure SSL/TLS
   - Set up process manager (systemd, supervisor)

---

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Check Python version (3.12+ required)
- Verify virtual environment is activated
- Check if port 8000 is already in use
- Verify .env file exists and has valid OPENAI_API_KEY

**Frontend build errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)
- Clear Vite cache: `rm -rf node_modules/.vite`

**Image generation fails:**
- Verify OpenAI API key is valid
- Check API quota/limits
- Review backend logs for detailed errors
- Ensure file permissions for local_storage directory

**Database errors:**
- Run `python scripts/clear_database.py` to reset
- Check file permissions on SQLite database
- Verify STORAGE_DIR path in .env

---

## 📁 Project Structure

```
image-gen-gallery/
├── backend/
│   ├── app/
│   │   ├── core/           # Settings, logging, security
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routes/         # API endpoints
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── tests/              # Pytest test suite
│   ├── local_storage/      # Generated at runtime
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/           # API client
│   │   ├── components/    # React components
│   │   └── __tests__/     # Component tests
│   ├── public/
│   └── package.json
├── scripts/               # Utility scripts
├── .env.example          # Environment template
├── .gitignore
└── README.md
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/image-gen-gallery.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Follow existing code style
   - Add tests for new features
   - Update documentation

4. **Run Tests**
   ```bash
   # Backend
   cd backend && pytest
   
   # Frontend
   cd frontend && npm test
   ```

5. **Submit Pull Request**
   - Clear description of changes
   - Link related issues
   - Ensure CI passes

### Code Style

- **Python**: Follow PEP 8, use Black formatter
- **TypeScript/React**: Use ESLint configuration
- **Commits**: Use conventional commits format

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OpenAI for the image generation API
- FastAPI team for the excellent framework
- React and Vite teams for the frontend tooling
- All contributors and testers

---


Made with ❤️ by the Image Gen Gallery team