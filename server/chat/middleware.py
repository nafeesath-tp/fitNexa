"""
chat/middleware.py — ASGI WebSocket authentication via HTTPOnly cookie.

Reads the same 'access_token' cookie used by the REST API and sets
scope['user'] so the ChatConsumer can trust it.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_str):
    """Validate the JWT and return the User, or AnonymousUser on failure."""
    try:
        token = AccessToken(token_str)
        user_id = token['user_id']
        return User.objects.get(id=user_id, is_active=True)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Authenticate WebSocket connections using the access_token cookie.
    Sets scope['user'] before the consumer connects.
    """

    async def __call__(self, scope, receive, send):
        # Extract cookies from the WebSocket handshake headers
        cookies = {}
        for header_name, header_value in scope.get('headers', []):
            if header_name == b'cookie':
                raw = header_value.decode('latin-1')
                for part in raw.split(';'):
                    if '=' in part:
                        k, v = part.strip().split('=', 1)
                        cookies[k.strip()] = v.strip()
                break

        token_str = cookies.get('access_token')

        if token_str:
            scope['user'] = await get_user_from_token(token_str)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
