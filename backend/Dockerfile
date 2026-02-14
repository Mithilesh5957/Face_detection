FROM python:3.11-slim

# System dependencies for OpenCV, InsightFace, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Install core Python dependencies (fast, well-cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install heavy ML dependencies (separate layer for caching)
COPY requirements-ml.txt .
RUN pip install --no-cache-dir -r requirements-ml.txt || \
    echo "⚠️  ML packages install failed — app will run with MediaPipe fallback"

# Copy application code
COPY . .

# Create directory for models (can be volume mounted)
RUN mkdir -p /app/models

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
