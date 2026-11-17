from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.exceptions import AuthenticationFailed


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads the access token from an
    HttpOnly cookie ('access_token') instead of the Authorization header.

    This satisfies the project requirement:
        ✅ Store the token only in HTTP cookies.
    """

    def authenticate(self, request):
        access_token = request.COOKIES.get("access_token")

        if access_token is None:
            # No cookie present — let DRF treat this as an unauthenticated request.
            # Protected views will then return 401 automatically.
            return None

        try:
            validated_token = self.get_validated_token(access_token)
        except TokenError:
            # If the cookie token is invalid or expired, treat as unauthenticated (None).
            # Protected views will still reject with 401; public views won't be blocked.
            return None

        try:
            user = self.get_user(validated_token)
        except AuthenticationFailed:
            # If the user no longer exists in the DB (e.g. DB reset) or is inactive,
            # treat as unauthenticated so public views and login can proceed cleanly.
            return None

        return (user, validated_token)
