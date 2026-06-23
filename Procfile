web: gunicorn resq.wsgi:application --chdir backend --bind 0.0.0.0:$PORT --workers 2
release: python backend/manage.py migrate --noinput
