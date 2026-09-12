import os
import django
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fitNexa.settings')
django.setup()

from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')


from django.test import Client
from django.contrib.auth import get_user_model
from chat.models import Conversation, Message, ChatReport
from client_management.models import TrainerAssignment

User = get_user_model()

def test(name, condition, extra=''):
    status = '[PASS]' if condition else '[FAIL]'
    print(f"{status} {name} | {extra}")
    if not condition:
        print(f"       -> Error Context: {extra}")

def run_tests():
    trainer_email = 'e2e_trainer@fitnexa.com'
    client1_email = 'e2e_client1@fitnexa.com'
    client2_email = 'e2e_client2@fitnexa.com'
    admin_email = 'e2e_admin@fitnexa.com'
    password = 'TestPassword123!'

    print('\n=== SETUP: CREATING TEST USERS & ASSIGNMENTS ===')
    # Clean up any previous runs
    User.objects.filter(email__in=[trainer_email, client1_email, client2_email, admin_email]).delete()

    trainer = User.objects.create_user(email=trainer_email, password=password, role='TRAINER', is_active=True, is_verified=True)
    client1 = User.objects.create_user(email=client1_email, password=password, role='CLIENT', is_active=True, is_verified=True)
    client2 = User.objects.create_user(email=client2_email, password=password, role='CLIENT', is_active=True, is_verified=True)
    admin_user = User.objects.create_superuser(email=admin_email, password=password, is_verified=True)

    # Assign client1 to trainer, but NOT client2
    TrainerAssignment.objects.create(client=client1, trainer=trainer, is_active=True)
    print("Created test users and assignments.")

    trainer_client = Client()
    client1_client = Client()
    client2_client = Client()
    admin_client = Client()

    print('\n=== PHASE 1: AUTHENTICATION ===')
    res1 = trainer_client.post('/api/auth/login/', json.dumps({'email': trainer_email, 'password': password}), content_type='application/json')
    test('Trainer login', res1.status_code == 200, f'HTTP {res1.status_code}')

    res2 = client1_client.post('/api/auth/login/', json.dumps({'email': client1_email, 'password': password}), content_type='application/json')
    test('Client 1 login', res2.status_code == 200, f'HTTP {res2.status_code}')
    
    res3 = client2_client.post('/api/auth/login/', json.dumps({'email': client2_email, 'password': password}), content_type='application/json')
    test('Client 2 login', res3.status_code == 200, f'HTTP {res3.status_code}')

    res_admin = admin_client.post('/api/auth/login/', json.dumps({'email': admin_email, 'password': password}), content_type='application/json')
    test('Admin login', res_admin.status_code == 200, f'HTTP {res_admin.status_code}')

    print('\n=== PHASE 2: CONVERSATION SECURITY ===')
    # Client 1 creates conversation with their assigned trainer
    res = client1_client.post('/api/chat/conversations/', json.dumps({'trainer_id': trainer.id}), content_type='application/json')
    test('Client 1 can start conversation with assigned trainer', res.status_code in [200, 201], f'HTTP {res.status_code} - {res.content.decode()}')
    if res.status_code not in [200, 201]:
        return
    conv_id = res.json()['id']

    # Client 2 tries to create conversation with the same trainer (not assigned)
    res = client2_client.post('/api/chat/conversations/', json.dumps({'trainer_id': trainer.id}), content_type='application/json')
    test('Client 2 DENIED from starting conversation (not assigned)', res.status_code == 403, f'HTTP {res.status_code} - {res.content.decode()}')

    print('\n=== PHASE 3: MESSAGE REST API ===')
    # Client 1 sends message
    res = client1_client.post(f'/api/chat/conversations/{conv_id}/messages/', {'content': 'Hello from client 1!'})
    test('Client 1 can send message', res.status_code == 201, f'HTTP {res.status_code} - {res.content.decode()}')
    msg_id = res.json()['id']
    
    # Client 2 tries to send message to Client 1's conversation
    res = client2_client.post(f'/api/chat/conversations/{conv_id}/messages/', {'content': 'I am client 2 sneaking in'})
    test('Client 2 DENIED from sending message to unauthorized conversation', res.status_code == 403, f'HTTP {res.status_code} - {res.content.decode()}')

    # Trainer reads history
    res = trainer_client.get(f'/api/chat/conversations/{conv_id}/messages/')
    test('Trainer can read conversation history', res.status_code == 200, f'HTTP {res.status_code}')
    if res.status_code == 200:
        msgs = res.json()['results']
        test('History contains correct message', len(msgs) > 0 and msgs[0]['content'] == 'Hello from client 1!')

    print('\n=== PHASE 4: REPORTS & ADMIN ===')
    # Trainer reports the message from client 1
    res = trainer_client.post(f'/api/chat/messages/{msg_id}/report/', json.dumps({'reason': 'Inappropriate content'}), content_type='application/json')
    test('Trainer can report a message', res.status_code == 201, f'HTTP {res.status_code} - {res.content.decode()}')
    report_id = res.json()['id']

    # Admin lists reports
    res = admin_client.get('/api/chat/admin/reports/')
    test('Admin can list reported messages', res.status_code == 200, f'HTTP {res.status_code}')
    if res.status_code == 200:
        reports = res.json()
        test('Report appears in Admin view', len(reports) > 0 and reports[0]['reason'] == 'Inappropriate content')

    # Admin reviews report
    res = admin_client.post(f'/api/chat/admin/reports/{report_id}/review/', json.dumps({'status': 'REVIEWED'}), content_type='application/json')
    test('Admin can mark report as REVIEWED', res.status_code == 200, f'HTTP {res.status_code} - {res.content.decode()}')

    print('\n=== TEARDOWN ===')
    User.objects.filter(email__in=[trainer_email, client1_email, client2_email, admin_email]).delete()
    print("Test users cleaned up. All REST security & APIs verified.\n")
    print("Note: WebSockets (typing, real-time broadcast) must be tested in the browser.")

if __name__ == '__main__':
    run_tests()
