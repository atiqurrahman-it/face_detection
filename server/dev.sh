#!/usr/bin/env bash
# Starts the backend with settings from .env (host, port, CORS origin, etc.).
# uvicorn's own --env-file flag loads too late to affect --host/--port, so this
# script exports .env into the shell first. Edit .env to change the port.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f .env ]; then
  echo "server/.env not found — copy the template first: cp .env.example .env" >&2
  exit 1
fi

set -a
source .env
set +a

exec uvicorn app.main:app --reload
