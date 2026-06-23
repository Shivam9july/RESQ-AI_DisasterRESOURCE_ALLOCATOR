#!/bin/bash
# Render build script — runs from the repository root.
set -e

echo "==> Installing Python dependencies"
pip install -r requirements.txt

echo "==> Collecting static files"
python backend/manage.py collectstatic --noinput

echo "==> Running database migrations"
python backend/manage.py migrate --noinput

echo "==> Build complete"
