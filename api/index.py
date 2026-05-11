from django.http import HttpResponse
import json

def api(request):
    """Vercel serverless function for Django API"""
    from django.core.wsgi import get_wsgi_application
    from django.conf import settings

    # Configure Django settings
    if not settings.configured:
        settings.configure(
            DEBUG=False,
            SECRET_KEY='your-secret-key',
            ALLOWED_HOSTS=['*'],
            INSTALLED_APPS=[
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'corsheaders',
                'rest_framework',
                'detection_api',
            ],
            MIDDLEWARE=[
                'corsheaders.middleware.CorsMiddleware',
                'django.middleware.common.CommonMiddleware',
            ],
            DATABASES={
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': ':memory:',
                }
            },
            ROOT_URLCONF='resq.urls',
            USE_TZ=True,
        )

    application = get_wsgi_application()

    # Handle the request
    from django.core.handlers.wsgi import WSGIHandler
    handler = WSGIHandler()
    handler.load_middleware()

    # Create WSGI environ
    environ = request.META.copy()
    environ['REQUEST_METHOD'] = request.method
    environ['PATH_INFO'] = request.path
    environ['QUERY_STRING'] = request.GET.urlencode()
    environ['CONTENT_TYPE'] = request.META.get('CONTENT_TYPE', '')
    environ['CONTENT_LENGTH'] = str(len(request.body)) if request.body else '0'

    # Handle the request
    response = handler(environ, lambda status, headers: None)

    return HttpResponse(response.content, status=response.status_code)