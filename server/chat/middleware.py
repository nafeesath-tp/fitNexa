"""
chat/middleware.py — ASGI WebSocket authentication.

Supports JWT authentication via:
  1. Query string: ws://.../ws/chat/<id>/?token=<jwt>
  2. HTTPOnly cookie: access_token=<jwt>
  3. Authorization header: Bearer <jwt>

Sets scope['user'] before the consumer connects.
"""
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_str):
    """Validate the JWT and return the User, or AnonymousUser on failure."""
    if not token_str:
        return AnonymousUser()
    try:
        token = AccessToken(token_str)
        user_id = token['user_id']
        return User.objects.get(id=user_id, is_active=True)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError) as e:
        logger.debug(f"JWT WebSocket auth failed: {e}")
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Authenticate WebSocket connections using query param, cookie, or header.
    Sets scope['user'] before the consumer connects.
    """

    async def __call__(self, scope, receive, send):
        token_str = None

        # 1. Check query string: ?token=...
        query_string = scope.get('query_string', b'').decode('latin-1')
        if query_string:
            query_params = parse_qs(query_string)
            if 'token' in query_params and query_params['token']:
                token_str = query_params['token'][0]

        # 2. Check cookies: access_token=...
        if not token_str:
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

        # 3. Check Authorization header: Bearer <token>
        if not token_str:
            for header_name, header_value in scope.get('headers', []):
                if header_name == b'authorization':
                    val = header_value.decode('latin-1')
                    if val.lower().startswith('bearer '):
                        token_str = val[7:].strip()
                    break

        if token_str:
            scope['user'] = await get_user_from_token(token_str)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
