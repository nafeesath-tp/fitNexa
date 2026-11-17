from rest_framework import serializers
from .models import TrainerSchedulingSettings, TrainerAvailability, BlockedDate, TrainerSlot, PersonalTrainingSession

class TrainerSchedulingSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerSchedulingSettings
        fields = ['session_duration', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class TrainerAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerAvailability
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'is_available']
        read_only_fields = ['id']

    def validate(self, data):
        # We also have validation in the model's clean() method, but DRF serializers
        # don't automatically call model.clean(). We should validate overlap here too,
        # or simply rely on the model save catching it (which raises ValidationError, 
        # but DRF expects rest_framework.exceptions.ValidationError).
        
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError("Start time must be before end time.")
            
        return data


class BlockedDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockedDate
        fields = ['id', 'date', 'reason', 'created_at']
        read_only_fields = ['id', 'created_at']


class TrainerSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerSlot
        fields = ['id', 'date', 'start_time', 'end_time', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'end_time': {'required': False},
            'status': {'required': False},
        }

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time."})
        return data

    def validate_status(self, value):
        # Prevent trainers from changing BOOKED status.
        # If this is an update, self.instance exists.
        if self.instance and self.instance.status == TrainerSlot.Status.BOOKED:
            raise serializers.ValidationError("Cannot edit a booked slot.")
        return value

class PersonalTrainingSessionSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    trainer_name = serializers.SerializerMethodField()

    class Meta:
        model = PersonalTrainingSession
        fields = ['id', 'client', 'client_name', 'trainer', 'trainer_name', 'slot', 'date', 'start_time', 'end_time', 'status', 'notes', 'created_at', 'completed_at']
        read_only_fields = ['id', 'client', 'trainer', 'slot', 'date', 'start_time', 'end_time', 'status', 'created_at', 'completed_at']

    def get_client_name(self, obj):
        profile = getattr(obj.client, 'clientprofile', None)
        if profile:
            return f"{profile.first_name} {profile.last_name}"
        return obj.client.email

    def get_trainer_name(self, obj):
        profile = getattr(obj.trainer, 'trainer_profile', None)
        if profile:
            return f"{profile.first_name} {profile.last_name}"
        return obj.trainer.email
