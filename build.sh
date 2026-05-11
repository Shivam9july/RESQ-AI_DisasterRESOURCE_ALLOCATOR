#!/bin/bash

# Collect static files
python backend/manage.py collectstatic --noinput

# Run migrations
python backend/manage.py migrate