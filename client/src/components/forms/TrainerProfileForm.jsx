import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trainerProfileSchema } from '../../validation/trainerProfileSchema';
import { trainerApi } from '../../services/trainer/trainerApi';
import toast from 'react-hot-toast';
import { FileBadge, Briefcase } from 'lucide-react';

import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { FormField, FormLabel, FormError, FormSection } from '../ui/Form';
import { Card, CardContent } from '../ui/Card';
import Modal from '../ui/Modal';

const TrainerProfileForm = ({ initialValues = {}, onSubmit, isLoading, isEditMode = false }) => {
  const [step, setStep] = useState(1);
  const [specializations, setSpecializations] = useState([]);
  const [isImageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    const fetchSpecializations = async () => {
      try {
        const response = await trainerApi.getSpecializations();
        if (response.success) {
          setSpecializations(response.data);
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
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-100 mb-2">
          {isEditMode ? 'Edit Profile' : 'Trainer Onboarding'}
        </h2>
        <p className="text-muted">Step {step} of 2</p>
        
        {/* Progress Bar */}
        <div className="w-full bg-surface h-2 rounded-full mt-4 overflow-hidden border border-border/10">
          <div 
            className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormSection title="Personal Information" description="Basic details for your profile">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField>
                      <FormLabel>First Name *</FormLabel>
                      <Input 
                        placeholder="Jane" 
                        {...register('first_name')} 
                        error={errors.first_name} 
                      />
                      <FormError error={errors.first_name} />
                    </FormField>
                    
                    <FormField>
                      <FormLabel>Last Name *</FormLabel>
                      <Input 
                        placeholder="Doe" 
                        {...register('last_name')} 
                        error={errors.last_name} 
                      />
                      <FormError error={errors.last_name} />
                    </FormField>
                  </div>
                  
                  <FormField>
                    <FormLabel>Phone Number *</FormLabel>
                    <Input 
                      placeholder="+1234567890" 
                      {...register('phone')} 
                      error={errors.phone} 
                    />
                    <FormError error={errors.phone} />
                  </FormField>

                  <FormField>
                    <FormLabel>Profile Image (Optional)</FormLabel>
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp"
                      className="block w-full text-sm text-gray-300
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary/10 file:text-primary
                        hover:file:bg-primary/20
                        cursor-pointer"
                      {...register('profile_image')}
                    />
                    <FormError error={errors.profile_image} />
                    
                    {isEditMode && initialValues.profile_image && typeof initialValues.profile_image === 'string' && (
                      <p className="text-sm text-muted mt-2">
                        Current image: <span className="text-gray-300 font-mono text-xs">{initialValues.profile_image.split('/').pop()}</span>{' '}
                        (<button type="button" onClick={() => setImageModalOpen(true)} className="text-primary hover:underline font-medium">View</button>)
                      </p>
                    )}
                  </FormField>
                </FormSection>
              </div>
            )}

            {/* STEP 2: Professional Details */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormSection title="Professional Details" description="Highlight your expertise">
                  
                  <FormField>
                    <FormLabel>Primary Specialization *</FormLabel>
                    <Select {...register('specialization')} error={errors.specialization}>
                      <option value="">Select Specialization</option>
                      {specializations.map(spec => (
                        <option key={spec.id} value={spec.id}>{spec.name}</option>
                      ))}
                    </Select>
                    <FormError error={errors.specialization} />
                  </FormField>

                  <FormField>
                    <FormLabel>Years of Experience *</FormLabel>
                    <Input 
                      type="number"
                      placeholder="5"
                      {...register('experience')} 
                      error={errors.experience} 
                    />
                    <FormError error={errors.experience} />
                  </FormField>

                  <FormField>
                    <FormLabel>Professional Bio *</FormLabel>
                    <textarea 
                      className="flex w-full rounded-lg border border-border/10 bg-background px-3 py-2 text-sm text-gray-100 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                      rows="4"
                      placeholder="Describe your training philosophy and background..."
                      {...register('bio')}
                    />
                    <FormError error={errors.bio} />
                  </FormField>

                  <FormField>
                    <FormLabel>Certification Document (PDF Only) *</FormLabel>
                    <input 
                      type="file" 
                      accept="application/pdf"
                      className="block w-full text-sm text-gray-300
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary/10 file:text-primary
                        hover:file:bg-primary/20
                        cursor-pointer"
                      {...register('certificate')}
                    />
                    <FormError error={errors.certificate} />
                    
                    {isEditMode && initialValues.certificate && typeof initialValues.certificate === 'string' && (
                      <p className="text-sm text-muted mt-2">
                        Current certificate: <a href={initialValues.certificate} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a>
                      </p>
                    )}
                  </FormField>
                </FormSection>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-border/10">
              {step > 1 ? (
                <Button type="button" onClick={prevStep} variant="secondary">
                  Back
                </Button>
              ) : (
                <div /> // Spacer
              )}
              
              {step < 2 ? (
                <Button type="button" onClick={nextStep}>
                  Next Step
                </Button>
              ) : (
                <Button type="submit" isLoading={isLoading}>
                  {isEditMode ? 'Save Changes' : 'Submit Application'}
                </Button>
              )}
            </div>
            
          </form>
        </CardContent>

      <Modal isOpen={isImageModalOpen} onClose={() => setImageModalOpen(false)} title="Profile Image">
        <div className="flex justify-center bg-gray-900 rounded-lg p-2">
          <img 
            src={initialValues.profile_image} 
            alt="Profile Preview" 
            className="max-w-full max-h-[60vh] rounded-md object-contain" 
          />
        </div>
      </Modal>
    </Card>
    </div>
  );
};

export default TrainerProfileForm;
