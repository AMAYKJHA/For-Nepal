import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'manageai.settings')

app = Celery('manageai')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
