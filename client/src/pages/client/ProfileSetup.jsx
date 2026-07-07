import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { clientProfileSchema } from '../../validation/clientProfileSchema';
import { clientApi } from '../../services/client/clientApi';
import { useClientStore } from '../../stores/clientStore';

import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import RadioGroup from '../../components/ui/RadioGroup';
import FormError from '../../components/ui/FormError';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const setProfile = useClientStore((state) => state.setProfile);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(clientProfileSchema),
    mode: 'onTouched'
  });

  const nextStep = async () => {
    let fieldsToValidate = [];
    if (step === 1) fieldsToValidate = ['first_name', 'last_name', 'phone', 'profile_image'];
    if (step === 2) fieldsToValidate = ['date_of_birth', 'gender', 'height_cm', 'weight_kg', 'target_weight_kg'];
    
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key === 'profile_image') {
          if (data.profile_image && data.profile_image.length > 0) {
            formData.append('profile_image', data.profile_image[0]);
          }
        } else if (data[key] !== undefined && data[key] !== '') {
          formData.append(key, data[key]);
        }
      });

      const response = await clientApi.createProfile(formData);
      
      if (response.success) {
        toast.success(response.message || 'Profile created successfully!');
        setProfile(response.data);
        navigate('/client/home', { replace: true });
      } else {
        toast.error(response.message || 'Failed to create profile.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred during profile setup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>Setup Your Profile</h2>
        <p style={{ color: '#6b7280' }}>Step {step} of 3</p>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '8px', borderRadius: '4px', marginTop: '1rem' }}>
          <div style={{ 
            width: `${(step / 3) * 100}%`, 
            backgroundColor: '#2563eb', 
            height: '100%', 
            borderRadius: '4px',
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-card" style={{ maxWidth: '100%' }}>
        
        {/* STEP 1: Personal Info */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '600' }}>Personal Information</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Input 
                label="First Name *" 
                placeholder="John" 
                {...register('first_name')} 
                error={errors.first_name?.message} 
              />
              <Input 
                label="Last Name *" 
                placeholder="Doe" 
                {...register('last_name')} 
                error={errors.last_name?.message} 
              />
            </div>
            
            <Input 
              label="Phone Number" 
              placeholder="+1234567890" 
              {...register('phone')} 
              error={errors.phone?.message} 
            />

            <div className="input-wrapper">
              <label className="input-label">Profile Image (Optional)</label>
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp"
                {...register('profile_image')}
                style={{ marginTop: '0.5rem' }}
              />
              <FormError message={errors.profile_image?.message} />
            </div>
          </div>
        )}

        {/* STEP 2: Basic & Health */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '600' }}>Body & Health</h3>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Input 
                label="Date of Birth" 
                type="date"
                {...register('date_of_birth')} 
                error={errors.date_of_birth?.message} 
              />
              <Select 
                label="Gender" 
                options={[
                  { label: 'Male', value: 'MALE' },
                  { label: 'Female', value: 'FEMALE' },
                  { label: 'Other', value: 'OTHER' },
                  { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY' }
                ]}
                {...register('gender')} 
                error={errors.gender?.message} 
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <Input 
                label="Height (cm)" 
                type="number"
                placeholder="175"
                {...register('height_cm')} 
                error={errors.height_cm?.message} 
              />
              <Input 
                label="Current Weight (kg)" 
                type="number"
                placeholder="70"
                step="0.1"
                {...register('weight_kg')} 
                error={errors.weight_kg?.message} 
              />
            </div>
            
            <Input 
              label="Target Weight (kg)" 
              type="number"
              placeholder="65"
              step="0.1"
              {...register('target_weight_kg')} 
              error={errors.target_weight_kg?.message} 
            />
          </div>
        )}

        {/* STEP 3: Fitness Goals */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '600' }}>Fitness Goals</h3>
            
            <Select 
              label="Primary Fitness Goal" 
              options={[
                { label: 'Lose Weight', value: 'LOSE_WEIGHT' },
                { label: 'Build Muscle', value: 'BUILD_MUSCLE' },
                { label: 'Improve Endurance', value: 'IMPROVE_ENDURANCE' },
                { label: 'Increase Flexibility', value: 'INCREASE_FLEXIBILITY' },
                { label: 'Maintain Fitness', value: 'MAINTAIN_FITNESS' },
                { label: 'General Health', value: 'GENERAL_HEALTH' }
              ]}
              {...register('fitness_goal')} 
              error={errors.fitness_goal?.message} 
            />

            <Select 
              label="Preferred Workout Style" 
              options={[
                { label: 'Strength Training', value: 'STRENGTH_TRAINING' },
                { label: 'Cardio', value: 'CARDIO' },
                { label: 'Yoga', value: 'YOGA' },
                { label: 'HIIT', value: 'HIIT' },
                { label: 'Pilates', value: 'PILATES' },
                { label: 'CrossFit', value: 'CROSSFIT' },
                { label: 'Swimming', value: 'SWIMMING' },
                { label: 'Cycling', value: 'CYCLING' }
              ]}
              {...register('preferred_workout')} 
              error={errors.preferred_workout?.message} 
            />

            <RadioGroup
              label="Experience Level"
              options={[
                { label: 'Beginner', value: 'BEGINNER' },
                { label: 'Intermediate', value: 'INTERMEDIATE' },
                { label: 'Advanced', value: 'ADVANCED' }
              ]}
              {...register('experience_level')}
              error={errors.experience_level?.message}
            />

            <Select 
              label="Dietary Preference" 
              options={[
                { label: 'No Preference', value: 'NONE' },
                { label: 'Vegetarian', value: 'VEGETARIAN' },
                { label: 'Vegan', value: 'VEGAN' },
                { label: 'Keto', value: 'KETO' },
                { label: 'Paleo', value: 'PALEO' },
                { label: 'Gluten-Free', value: 'GLUTEN_FREE' },
                { label: 'Dairy-Free', value: 'DAIRY_FREE' }
              ]}
              {...register('diet_preference')} 
              error={errors.diet_preference?.message} 
              style={{ marginTop: '1rem' }}
            />
            
            <div className="input-wrapper" style={{ marginTop: '1rem' }}>
              <label className="input-label">Medical Conditions / Injuries</label>
              <textarea 
                className="input-field"
                rows="3"
                placeholder="Any medical conditions or injuries the trainer should know about"
                {...register('medical_condition')}
              ></textarea>
              <FormError message={errors.medical_condition?.message} />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
          {step > 1 ? (
            <Button type="button" onClick={prevStep} variant="secondary" style={{ width: '48%' }}>
              Back
            </Button>
          ) : (
            <div></div> // Spacer
          )}
          
          {step < 3 ? (
            <Button type="button" onClick={nextStep} variant="primary" style={{ width: step > 1 ? '48%' : '100%' }}>
              Next Step
            </Button>
          ) : (
            <Button type="submit" isLoading={isLoading} variant="primary" style={{ width: '48%' }}>
              Complete Setup
            </Button>
          )}
        </div>
        
      </form>
    </div>
  );
};

export default ProfileSetup;
