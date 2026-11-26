# Hugging Face Space (Docker SDK) for the Crime Track backend.
# Copy this file into the Space repo as `Dockerfile`. It builds from the public
# GitHub repo, so pushing to GitHub + "Factory rebuild" on the Space redeploys.
#
# Space settings → Variables and secrets:
#   Secret   JWT_SECRET_KEY        long random string
#   Secret   SUPER_ADMIN_PASSWORD  live super admin password (never the seed default)
#   Variable FRONTEND_ORIGIN       https://<your-app>.vercel.app
#
# Storage is ephemeral on the free tier: app.db and uploads/ reset on restart.
FROM python:3.10-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential cmake git libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1
WORKDIR /home/user

ARG REPO_URL=https://github.com/atiqurrahman-it/face_detection.git
ARG REPO_REF=main
RUN git clone --depth 1 --branch "$REPO_REF" "$REPO_URL" app

WORKDIR /home/user/app/server
RUN pip install --no-cache-dir --user -r requirements.txt

ENV APP_ENV=production \
    DATABASE_URL=sqlite:///./app.db

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
