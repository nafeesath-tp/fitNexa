import os, sys, django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fitNexa.settings')
django.setup()
from accounts.models import TrainerProfile

tp = TrainerProfile.objects.exclude(certificate='').last()
if tp:
    print('URL:', tp.certificate.url)
    print('NAME:', tp.certificate.name)
else:
    print('No certificate found.')
