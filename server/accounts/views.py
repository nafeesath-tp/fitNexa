from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError

from .serializers import (
    SignupSerializer, VerifyOTPSerializer, ResendOTPSerializer, LoginSerializer,
    ForgotPasswordSerializer, VerifyResetOTPSerializer, ResetPasswordSerializer,
    PublicSpecializationSerializer
)
from .services import signup_user, verify_otp, resend_otp, login_user, forgot_password, verify_reset_otp, reset_password
from .models import Specialization, TrainerProfile

class PublicSpecializationListAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        specializations = Specialization.objects.filter(is_active=True)
        serializer = PublicSpecializationSerializer(specializations, many=True)
        return Response({
            "success": True,
            "data": serializer.data
        }, status=status.HTTP_200_OK)


class SignupAPIView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):

        serializer = SignupSerializer(data=request.data)

        if serializer.is_valid():
            try:
                signup_user(serializer.validated_data)
                return Response(
                    {
                        "success": True,
                        "message": "OTP sent successfully. Please verify your email.",
                        "data": {},
                    },
                    status=status.HTTP_201_CREATED,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "Signup failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                return Response(
                    {
                        "success": False,
                        "message": "Something went wrong. Please try again later.",
                        "errors": {},
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {
                "success": False,
                "message": "Signup failed.",
                "errors": serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
        )


class VerifyOTPAPIView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)

        if serializer.is_valid():
            try:
                verify_otp(serializer.validated_data)
                return Response(
                    {
                        "success": True,
                        "message": "Email verified successfully. You can now log in.",
                        "data": {},
                    },
                    status=status.HTTP_200_OK,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "OTP verification failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class ResendOTPAPIView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)

        if serializer.is_valid():
            try:
                resend_otp(serializer.validated_data)
                return Response(
                    {
                        "success": True,
                        "message": "A new OTP has been sent to your email.",
                        "data": {},
                    },
                    status=status.HTTP_200_OK,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "Failed to resend OTP.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                return Response(
                    {
                        "success": False,
                        "message": "Something went wrong. Please try again later.",
                        "errors": {},
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class LoginAPIView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            try:
                result = login_user(serializer.validated_data)
                
                response = Response(
                    {
                        "success": True,
                        "message": "Login successful.",
                        "data": result["response_data"],
                    },
                    status=status.HTTP_200_OK,
                )

                # Store tokens in HttpOnly cookies — never exposed to JavaScript
                response.set_cookie(
                    key="access_token",
                    value=result["access"],
                    httponly=True,
                    samesite="Lax",
                    secure=False,       # Set True in production (HTTPS)
                    max_age=60 * 30,    # 30 minutes
                )
                response.set_cookie(
                    key="refresh_token",
                    value=result["refresh"],
                    httponly=True,
                    samesite="Lax",
                    secure=False,              # Set True in production (HTTPS)
                    max_age=60 * 60 * 24 * 7,  # 7 days
                )

                return response

            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "Login failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                return Response(
                    {
                        "success": False,
                        "message": "Something went wrong. Please try again later.",
                        "errors": {},
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {
                "success": False,
                "message": "Login failed.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class LogoutAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response(
            {
                "success": True,
                "message": "Logged out successfully.",
                "data": {},
            },
            status=status.HTTP_200_OK,
        )

        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        return response


class ForgotPasswordAPIView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)

        if serializer.is_valid():
            try:
                forgot_password(serializer.validated_data)
            except Exception:
                pass  # Silent — never reveal if email exists or if sending failed

            # Always return success to prevent user enumeration
            return Response(
                {
                    "success": True,
                    "message": "If this email is registered, a password reset OTP has been sent.",
                    "data": {},
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class VerifyResetOTPAPIView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = VerifyResetOTPSerializer(data=request.data)

        if serializer.is_valid():
            try:
                verify_reset_otp(serializer.validated_data)
                return Response(
                    {
                        "success": True,
                        "message": "OTP verified successfully. You may now reset your password.",
                        "data": {},
                    },
                    status=status.HTTP_200_OK,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "OTP verification failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class ResetPasswordAPIView(APIView):

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        # OTP is passed alongside new password for atomic verification + reset
        data = request.data.copy()
        serializer = ResetPasswordSerializer(data=data)

        if serializer.is_valid():
            try:
                # Merge OTP from request into validated_data for the service
                validated = serializer.validated_data.copy()
                validated["otp"] = request.data.get("otp", "")

                reset_password(validated)
                return Response(
                    {
                        "success": True,
                        "message": "Password reset successfully. You can now log in.",
                        "data": {},
                    },
                    status=status.HTTP_200_OK,
                )
            except ValidationError as e:
                return Response(
                    {
                        "success": False,
                        "message": "Password reset failed.",
                        "errors": e.detail,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception:
                return Response(
                    {
                        "success": False,
                        "message": "Something went wrong. Please try again later.",
                        "errors": {},
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {
                "success": False,
                "message": "Invalid input.",
                "errors": serializer.errors,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


class MeAPIView(APIView):
    """
    GET /api/auth/me/

    Returns the authenticated user's identity from the HttpOnly JWT cookie.
    Used by the React frontend to restore session state (e.g. Zustand store)
    after a page refresh without requiring the user to log in again.

    Response varies by role:
    - CLIENT  : email, role, is_profile_completed flag
    - TRAINER : email, role, approval_status from TrainerProfile
    - ADMIN   : email, role
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            "id": user.id,
            "email": user.email,
            "role": user.role,
        }

        # Attach role-specific fields.
        # Use explicit DB query for TRAINER so we catch missing profiles cleanly.
        if user.role == "TRAINER":
            trainer_profile = TrainerProfile.objects.filter(user=user).first()
            if trainer_profile:
                data["approval_status"] = trainer_profile.approval_status
            else:
                # Trainer exists but hasn't submitted the onboarding form yet.
                data["approval_status"] = "PENDING_ONBOARDING"

        elif user.role == "CLIENT":
            try:
                data["is_profile_completed"] = user.client_profile.is_profile_completed
                data["first_name"] = user.client_profile.first_name
            except Exception:
                data["is_profile_completed"] = False

            # Annotate subscription status so the frontend can route to dashboard.
            try:
                from subscriptions.models import ClientSubscription
                from django.utils import timezone
                active_sub = ClientSubscription.objects.filter(
                    client=user,
                    payment_status=ClientSubscription.PaymentStatus.ACTIVE,
                ).order_by("-created_at").first()
                has_active = (
                    active_sub is not None
                    and (active_sub.expires_at is None or active_sub.expires_at > timezone.now())
                )
                data["has_active_subscription"] = has_active
                data["subscription_plan_name"] = active_sub.plan.name if active_sub else "FREE"
            except Exception:
                data["has_active_subscription"] = False
                data["subscription_plan_name"] = "FREE"

        return Response(
            {
                "success": True,
                "message": "Authenticated user retrieved.",
                "data": data,
            },
            status=status.HTTP_200_OK,
        )


from .google_auth import verify_google_token
from .models import User
from rest_framework_simplejwt.tokens import RefreshToken


class TokenRefreshAPIView(APIView):
    """
    POST /api/auth/token/refresh/

    Reads the HttpOnly 'refresh_token' cookie and issues a fresh
    'access_token' cookie.  Called automatically by the frontend
    axios interceptor when a 401 is received.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response(
                {"success": False, "message": "No refresh token found. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token)
            new_access = str(refresh.access_token)

            response = Response(
                {"success": True, "message": "Access token refreshed."},
                status=status.HTTP_200_OK,
            )
            response.set_cookie(
                key="access_token",
                value=new_access,
                httponly=True,
                samesite="Lax",
                secure=False,
                max_age=60 * 30,  # 30 minutes
            )
            return response

        except Exception:
            return Response(
                {"success": False, "message": "Refresh token is invalid or expired. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class GoogleAuthAPIView(APIView):
    """
    POST /api/auth/google-auth/

    Step 1 of the Google login/signup flow.
    - Verifies the Google ID token.
    - If the user already exists  → logs them in and returns tokens.
    - If the user does not exist  → returns needs_signup=True so the
      frontend can show the role-selection step (Step 2).

    Routing after a successful login uses the same data shape as
    the email login endpoint so that getHomeRoute() works identically.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('id_token')
        if not token:
            return Response(
                {"success": False, "message": "ID token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            idinfo = verify_google_token(token)
            email  = idinfo['email']

            user = User.objects.filter(email=email).first()

            if user:
                # ── User exists: build login response ──────────────────────
                tokens = get_tokens_for_user(user)

                response_data = {
                    "id": user.id,
                    "email": user.email,
                    "role":  user.role,
                }

                if user.role == "TRAINER":
                    # Safe lookup — no bare except, no hasattr magic.
                    trainer_profile = TrainerProfile.objects.filter(user=user).first()
                    if trainer_profile:
                        response_data["approval_status"] = trainer_profile.approval_status
                    else:
                        # User exists with TRAINER role but hasn't completed
                        # onboarding yet (e.g. signed up via Google previously).
                        response_data["approval_status"] = "PENDING_ONBOARDING"

                elif user.role == "CLIENT":
                    try:
                        response_data["is_profile_completed"] = user.client_profile.is_profile_completed
                        response_data["first_name"] = user.client_profile.first_name
                    except Exception:
                        response_data["is_profile_completed"] = False
                        
                    try:
                        from subscriptions.models import ClientSubscription
                        active = ClientSubscription.objects.filter(client=user, payment_status="ACTIVE").order_by("-created_at").first()
                        response_data["subscription_plan_name"] = active.plan.name if active else "FREE"
                    except Exception:
                        response_data["subscription_plan_name"] = "FREE"

                response = Response(
                    {
                        "success": True,
                        "message": "Login successful.",
                        "data": response_data,
                    },
                    status=status.HTTP_200_OK,
                )
                response.set_cookie(
                    key="access_token", value=tokens["access"],
                    httponly=True, samesite="Lax", secure=False, max_age=60 * 30,
                )
                response.set_cookie(
                    key="refresh_token", value=tokens["refresh"],
                    httponly=True, samesite="Lax", secure=False, max_age=60 * 60 * 24 * 7,
                )
                return response

            else:
                # ── User does not exist: prompt for role selection ──────────
                return Response(
                    {
                        "success":      True,
                        "message":      "User not found. Role selection required.",
                        "needs_signup": True,
                        "email":        email,
                        "first_name":   idinfo.get("given_name",  ""),
                        "last_name":    idinfo.get("family_name", ""),
                    },
                    status=status.HTTP_202_ACCEPTED,
                )

        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class GoogleSignupAPIView(APIView):
    """
    POST /api/auth/google-signup/

    Step 2 of the Google signup flow (called only for NEW users).
    - Re-verifies the Google ID token (never trust client-side data).
    - Creates the User record with the chosen role.
    - For CLIENT: also creates a ClientProfile so setup can proceed.
    - For TRAINER: does NOT create a TrainerProfile here — the trainer
      must complete the onboarding form first. The response carries
      approval_status = 'PENDING_ONBOARDING' so getHomeRoute() sends
      them to /trainer/onboarding.
    - Returns HttpOnly JWT cookies and user data.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.data.get('id_token')
        role  = request.data.get('role')

        if not token or not role:
            return Response(
                {"success": False, "message": "ID token and role are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in dict(User.Role.choices):
            return Response(
                {"success": False, "message": "Invalid role"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            idinfo     = verify_google_token(token)
            email      = idinfo['email']
            first_name = idinfo.get("given_name",  "")
            last_name  = idinfo.get("family_name", "")

            # Guard: race-condition check — user might have been created
            # between Step 1 and Step 2.
            if User.objects.filter(email=email).exists():
                return Response(
                    {"success": False, "message": "User already exists. Please log in."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # ── Create the User ────────────────────────────────────────────
            user = User.objects.create(
                email=email,
                role=role,
                is_verified=True,   # Google has already verified the email
                is_active=True,
            )
            user.set_unusable_password()   # Google users don't need a password
            user.save()

            # ── Create role-specific profile ───────────────────────────────
            if role == User.Role.CLIENT:
                from client.models import ClientProfile
                ClientProfile.objects.create(
                    user=user,
                    first_name=first_name,
                    last_name=last_name,
                    phone="",
                )

            # TRAINER: no TrainerProfile is created here.
            # The trainer will be directed to /trainer/onboarding where
            # they fill in bio, experience, specialization, certificate, etc.
            # Only after submitting that form is a TrainerProfile created.

            # ── Issue tokens and build response ────────────────────────────
            tokens = get_tokens_for_user(user)

            response_data = {
                "email": user.email,
                "role":  user.role,
            }

            if user.role == "CLIENT":
                response_data["is_profile_completed"] = False

            elif user.role == "TRAINER":
                # PENDING_ONBOARDING signals getHomeRoute() to send the
                # user to /trainer/onboarding (no TrainerProfile exists yet).
                response_data["approval_status"] = "PENDING_ONBOARDING"

            response = Response(
                {
                    "success": True,
                    "message": "Account created successfully.",
                    "data": response_data,
                },
                status=status.HTTP_201_CREATED,
            )
            response.set_cookie(
                key="access_token", value=tokens["access"],
                httponly=True, samesite="Lax", secure=False, max_age=60 * 30,
            )
            response.set_cookie(
                key="refresh_token", value=tokens["refresh"],
                httponly=True, samesite="Lax", secure=False, max_age=60 * 60 * 24 * 7,
            )
            return response

        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

