import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trainerProfileSchema } from '../../validation/trainerProfileSchema';
import { trainerApi } from '../../services/trainer/trainerApi';
import toast from 'react-hot-toast';

import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import FormError from '../ui/FormError';

const TrainerProfileForm = ({ initialValues = {}, onSubmit, isLoading, isEditMode = false }) => {
  const [step, setStep] = useState(1);
  const [specializations, setSpecializations] = useState([]);

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const response = await trainerApi.getSpecializations();
        if (response.success) {
          const formattedSpecs = response.data.map(spec => ({
            label: spec.name,
            value: spec.id
          }));
          setSpecializations(formattedSpecs);
        }
      } catch (error) {
        toast.error('Failed to load specializations');
      }
    };
    fetchSpecializations();
  }, []);

  const { register, handleSubmit, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(trainerProfileSchema),
    mode: 'onTouched',
    defaultValues: initialValues
  });

  const nextStep = async () => {
    let fieldsToValidate = [];
    if (step === 1) fieldsToValidate = ['first_name', 'last_name', 'phone', 'profile_image'];
    if (step === 2) fieldsToValidate = ['bio', 'experience', 'specialization', 'certificate'];
    
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
          {isEditMode ? 'Edit Profile' : 'Trainer Onboarding'}
        </h2>
        <p style={{ color: '#6b7280' }}>Step {step} of 2</p>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '8px', borderRadius: '4px', marginTop: '1rem' }}>
          <div style={{ 
            width: `${(step / 2) * 100}%`, 
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
                placeholder="Jane" 
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
              label="Phone Number *" 
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
              
              {isEditMode && initialValues.profile_image && typeof initialValues.profile_image === 'string' && (
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Current image: <a href={initialValues.profile_image} target="_blank" rel="noreferrer">View</a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Professional Details */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '600' }}>Professional Details</h3>
            
            <Select 
              label="Primary Specialization *" 
              options={[{ label: 'Select Specialization', value: '' }, ...specializations]}
              {...register('specialization')} 
              error={errors.specialization?.message} 
            />

            <Input 
              label="Years of Experience *" 
              type="number"
              placeholder="5"
              {...register('experience')} 
              error={errors.experience?.message} 
            />

            <div className="input-wrapper" style={{ marginTop: '1rem' }}>
              <label className="input-label">Professional Bio *</label>
              <textarea 
                className="input-field"
                rows="4"
                placeholder="Describe your training philosophy and background..."
                {...register('bio')}
              ></textarea>
              <FormError message={errors.bio?.message} />
            </div>

            <div className="input-wrapper" style={{ marginTop: '1rem' }}>
              <label className="input-label">Certification Document (PDF Only, Optional for edit)</label>
              <input 
                type="file" 
                accept="application/pdf"
                {...register('certificate')}
                style={{ marginTop: '0.5rem' }}
              />
              <FormError message={errors.certificate?.message} />
              
              {isEditMode && initialValues.certificate && typeof initialValues.certificate === 'string' && (
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Current certificate: <a href={initialValues.certificate} target="_blank" rel="noreferrer">View</a>
                </p>
              )}
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
          
          {step < 2 ? (
            <Button type="button" onClick={nextStep} variant="primary" style={{ width: step > 1 ? '48%' : '100%' }}>
              Next Step
            </Button>
          ) : (
            <Button type="submit" isLoading={isLoading} variant="primary" style={{ width: '48%' }}>
              {isEditMode ? 'Save Changes' : 'Submit Application'}
            </Button>
          )}
        </div>
        
      </form>
    </div>
  );
};

export default TrainerProfileForm;
