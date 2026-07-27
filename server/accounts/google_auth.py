from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings

def verify_google_token(token):
    """
    Verifies a Google ID token and returns the decoded info.
    Raises ValueError if the token is invalid.
    """
    client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', None)
    if not client_id:
        raise ValueError("Google OAuth Client ID is not configured.")
        
    try:
        # Specify the CLIENT_ID of the app that accesses the backend:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), client_id)
        
        # ID token is valid. Get the user's Google Account ID from the decoded token.
        return idinfo
    except ValueError as e:
        # Invalid token
        raise ValueError(f"Invalid Google token: {str(e)}")
