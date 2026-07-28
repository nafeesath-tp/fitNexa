import random

from django.conf import settings
from django.core.mail import send_mail


def generate_otp():
    """
    Generate a random 6-digit OTP.
    """
    return str(random.randint(100000, 999999))


def send_otp_email(email, otp):
    subject = "FitNexa Email Verification"

    message = f"""
Hello,

Your verification code is: {otp}

This OTP is valid for 5 minutes.

If you didn't request this, please ignore this email.

Regards,
FitNexa Team
"""

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )