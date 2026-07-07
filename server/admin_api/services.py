from client.models import ClientProfile
from client.services import calculate_bmi, _bmi_category
from rest_framework.exceptions import NotFound

def list_clients():
    """
    List all clients.
    """
    return ClientProfile.objects.all().order_by('-created_at')

def get_client_detail(client_id):
    """
    Retrieve a specific client profile and calculate their BMI dynamically.
    """
    try:
        profile = ClientProfile.objects.get(id=client_id)
    except ClientProfile.DoesNotExist:
        raise NotFound("Client profile not found.")
    
    bmi = calculate_bmi(profile.weight_kg, profile.height_cm)
    
    return {
        "profile": profile,
        "bmi": bmi,
        "bmi_category": _bmi_category(bmi)
    }
