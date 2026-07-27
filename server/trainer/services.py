from rest_framework import serializers

from accounts.models import TrainerProfile


def submit_trainer_onboarding(user, validated_data):
    """
    Business logic for trainer onboarding.

    Rules:
    - User must have role == TRAINER (enforced by IsTrainer permission upstream)
    - TrainerProfile must not already exist for this user
    - Creates profile with approval_status = PENDING

    Returns the created TrainerProfile.
    """
    profile = TrainerProfile.objects.filter(user=user).first()
    
    if profile:
        if profile.approval_status != TrainerProfile.ApprovalStatus.REJECTED:
            raise serializers.ValidationError(
                {"detail": "You have already submitted your onboarding profile."}
            )
        
        # Update existing rejected profile
        for attr, value in validated_data.items():
            setattr(profile, attr, value)
            
        profile.approval_status = TrainerProfile.ApprovalStatus.PENDING
        profile.rejection_reason = None
        profile.save()
        return profile

    profile = TrainerProfile.objects.create(
        user=user,
        **validated_data,
    )

    return profile
