# Embedflow FastAPI worker — deploy root = worker/ (e.g. Railway service with Root Directory: worker)
FROM python:3.11-slim-bookworm

WORKDIR /app

# pdfplumber / cryptography wheels are usually binary; gcc only if pip build fails
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Railway injects PORT at runtime
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
