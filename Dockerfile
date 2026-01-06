FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    STREAMLIT_SERVER_HEADLESS=true \
    STREAMLIT_BROWSER_GATHER_USAGE_STATS=false \
    STREAMLIT_SERVER_ENABLE_CORS=false \
    STREAMLIT_SERVER_ENABLE_XSRF_PROTECTION=true \
    PORT=7860

WORKDIR /app

COPY requirements.txt .
RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm build-essential \
    && npm install -g npm@latest \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY app app
COPY data data
COPY scripts scripts
COPY README.md README.md
COPY assets assets
COPY components components

EXPOSE 7860

CMD ["sh", "-c", "streamlit run app/streamlit_app.py --server.port=${PORT:-7860} --server.address=0.0.0.0"]
