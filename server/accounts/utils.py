import random

from django.conf import settings
from django.core.mail import send_mail


def generate_otp():
    """
    Generate a random 6-digit OTP.
    """
    return str(random.randint(100000, 999999))


def send_otp_email(email, otp):
    print("\n" + "="*60)
    print(f"📧 [FitNexa Verification] OTP for {email} -> {otp}")
    print("="*60 + "\n")

    subject = "FitNexa Email Verification"

    message = f"""
Hello,

Your verification code is: {otp}

This OTP is valid for 5 minutes.

If you didn't request this, please ignore this email.

Regards,
FitNexa Team
"""

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        print(f"✅ Email successfully dispatched to {email} via SMTP. (Note: Check Spam/Junk folder if not in Inbox)")
    except Exception as e:
        print(f"⚠️ Warning: Could not send SMTP email to {email}: {e}")
        print(f"💡 [DEV MODE] Please use the OTP code printed in the console above: {otp}")