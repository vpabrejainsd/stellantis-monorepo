# Use a slim Python base
FROM python:3.10-slim AS base
WORKDIR /app

# Install system deps (if any) and Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Expose Flask port
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=4001

EXPOSE 4001
CMD ["flask", "run"]
