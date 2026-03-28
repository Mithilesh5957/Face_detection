# 🎓 College Attendance System — Face Detection

A full-stack attendance tracking system using **face detection and recognition**. Teachers can start attendance sessions, and the system automatically identifies students via a live camera feed.

## Tech Stack

| Layer      | Technology                                       |
|------------|--------------------------------------------------|
| Frontend   | React 18, Vite, TailwindCSS                      |
| Backend    | FastAPI, SQLAlchemy (async), Uvicorn              |
| AI/ML      | OpenCV, MediaPipe, InsightFace, ONNX Runtime      |
| Database   | MySQL 8.0                                        |
| Deployment | Docker Compose                                   |

---

## Prerequisites

- **Docker Desktop** (recommended) — [Install](https://docs.docker.com/desktop/)
- OR for local dev:
  - Python 3.11+
  - Node.js 18+
  - MySQL 8.0

---

## 🚀 Quick Start (Docker — Recommended)

```bash
# 1. Clone the repository
git clone <repo-url> && cd Face_detection

# 2. Start all services
docker compose up --build
```

| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3000         |
| Backend   | http://localhost:8000         |
| API Docs  | http://localhost:8000/docs    |
| MySQL     | localhost:3307               |

**Default Admin Login:**
- Email: `admin@college.edu`
- Password: `admin123`

---

## 🔧 Manual Local Setup

### 1. Database

Start MySQL (via Docker or local install):

```bash
docker compose up db -d
```

### 2. Backend

```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# (Optional) Install ML packages for full face recognition
pip install -r requirements-ml.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend dev server runs on `http://localhost:3000` and proxies `/api` requests to the backend.

---

## 📁 Project Structure

```
Face_detection/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── config.py           # Environment config
│   │   ├── database.py         # Async SQLAlchemy setup
│   │   ├── models.py           # ORM models
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── auth.py             # JWT authentication
│   │   ├── routers/            # API route handlers
│   │   └── services/           # Face detection & recognition
│   ├── requirements.txt
│   ├── requirements-ml.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   └── context/
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint                | Description               |
|--------|-------------------------|---------------------------|
| POST   | `/api/auth/login`       | Login, get JWT token       |
| POST   | `/api/auth/register`    | Register new user          |
| GET    | `/api/students`         | List all students          |
| POST   | `/api/students`         | Add student (with face)    |
| POST   | `/api/attendance/start` | Start attendance session   |
| GET    | `/api/reports`          | View attendance reports    |
| GET    | `/api/health`           | Health check               |

Full interactive docs at: `http://localhost:8000/docs`

---

## ⚙️ Environment Variables

| Variable                    | Default                | Description                    |
|-----------------------------|------------------------|--------------------------------|
| `DB_HOST`                   | `localhost`            | MySQL host                     |
| `DB_PORT`                   | `3306`                 | MySQL port                     |
| `DB_USER`                   | `root`                 | MySQL user                     |
| `DB_PASSWORD`               | `attendance_secret`    | MySQL password                 |
| `DB_NAME`                   | `attendance_db`        | Database name                  |
| `SECRET_KEY`                | *(auto)*               | JWT signing key                |
| `FACE_SIMILARITY_THRESHOLD` | `0.45`                 | Face match strictness (0–1)    |
