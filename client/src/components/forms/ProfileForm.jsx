


import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientProfileSchema } from '../../validation/clientProfileSchema';
import { Target, Activity, Dumbbell, Zap } from 'lucide-react';

import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import RadioGroup, { RadioOption } from '../ui/RadioGroup';
import { FormField, FormLabel, FormError, FormSection } from '../ui/Form';
import { Card, CardContent } from '../ui/Card';
import Modal from '../ui/Modal';

const ProfileForm = ({ initialValues = {}, onSubmit, isLoading, isEditMode = false }) => {
  const [step, setStep] = useState(1);
  const [isImageModalOpen, setImageModalOpen] = useState(false);

  const { register, handleSubmit, trigger, control, formState: { errors } } = useForm({
    resolver: zodResolver(clientProfileSchema),
    mode: 'onTouched',
    defaultValues: initialValues
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

  return (
    <div className={isEditMode ? 'w-full' : 'w-full max-w-2xl mx-auto'}>
      {!isEditMode && (
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-100 mb-2">
            Setup Your Profile
          </h2>
          <p className="text-muted">Step {step} of 3</p>

          {/* Progress Bar */}
          <div className="w-full bg-surface h-2 rounded-full mt-4 overflow-hidden border border-border/10">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      <Card className={isEditMode ? 'border-none bg-transparent shadow-none' : ''}>
        <CardContent className={isEditMode ? 'p-0' : 'pt-6'}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                e.target.tagName !== 'BUTTON' &&
                e.target.tagName !== 'TEXTAREA'
              ) {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >

            {/* STEP 1: Personal Info */}
            {(isEditMode || step === 1) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormSection title="Personal Information" description="Tell us about yourself">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField>
                      <FormLabel>First Name *</FormLabel>
                      <Input
                        placeholder="John"
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
                    <FormLabel>Phone Number</FormLabel>
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

            {/* STEP 2: Basic & Health */}
            {(isEditMode || step === 2) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormSection title="Body & Health" description="Vital stats to personalize your plan">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField>
                      <FormLabel>Date of Birth</FormLabel>
                      <Input
                        type="date"
                        {...register('date_of_birth')}
                        error={errors.date_of_birth}
                      />
                      <FormError error={errors.date_of_birth} />
                    </FormField>

                    <FormField>
                      <FormLabel>Gender</FormLabel>
                      <Select {...register('gender')} error={errors.gender}>
                        <option value="">Select Gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                        <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                      </Select>
                      <FormError error={errors.gender} />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField>
                      <FormLabel>Height (cm)</FormLabel>
                      <Input
                        type="number"
                        placeholder="175"
                        {...register('height_cm')}
                        error={errors.height_cm}
                      />
                      <FormError error={errors.height_cm} />
                    </FormField>

                    <FormField>
                      <FormLabel>Current Weight (kg)</FormLabel>
                      <Input
                        type="number"
                        placeholder="70"
                        step="0.1"
                        {...register('weight_kg')}
                        error={errors.weight_kg}
                      />
                      <FormError error={errors.weight_kg} />
                    </FormField>
                  </div>

                  <FormField>
                    <FormLabel>Target Weight (kg)</FormLabel>
                    <Input
                      type="number"
                      placeholder="65"
                      step="0.1"
                      {...register('target_weight_kg')}
                      error={errors.target_weight_kg}
                    />
                    <FormError error={errors.target_weight_kg} />
                  </FormField>
                </FormSection>
              </div>
            )}

            {/* STEP 3: Fitness Goals */}
            {(isEditMode || step === 3) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <FormSection title="Fitness Goals" description="What do you want to achieve?">

                  <FormField>
                    <FormLabel>Primary Fitness Goal</FormLabel>
                    <Select {...register('fitness_goal')} error={errors.fitness_goal}>
                      <option value="">Select a Goal</option>
                      <option value="LOSE_WEIGHT">Lose Weight</option>
                      <option value="BUILD_MUSCLE">Build Muscle</option>
                      <option value="IMPROVE_ENDURANCE">Improve Endurance</option>
                      <option value="INCREASE_FLEXIBILITY">Increase Flexibility</option>
                      <option value="MAINTAIN_FITNESS">Maintain Fitness</option>
                      <option value="GENERAL_HEALTH">General Health</option>
                    </Select>
                    <FormError error={errors.fitness_goal} />
                  </FormField>

                  <FormField>
                    <FormLabel>Preferred Workout Style</FormLabel>
                    <Select {...register('preferred_workout')} error={errors.preferred_workout}>
                      <option value="">Select a Style</option>
                      <option value="STRENGTH_TRAINING">Strength Training</option>
                      <option value="CARDIO">Cardio</option>
                      <option value="YOGA">Yoga</option>
                      <option value="HIIT">HIIT</option>
                      <option value="PILATES">Pilates</option>
                      <option value="CROSSFIT">CrossFit</option>
                      <option value="SWIMMING">Swimming</option>
                      <option value="CYCLING">Cycling</option>
                    </Select>
                    <FormError error={errors.preferred_workout} />
                  </FormField>

                  <FormField>
                    <FormLabel>Experience Level</FormLabel>
                    <Controller
                      name="experience_level"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <RadioGroup className="grid-cols-3">
                          <RadioOption
                            value="BEGINNER"
                            label="Beginner"
                            checked={value === 'BEGINNER'}
                            onChange={() => onChange('BEGINNER')}
                            error={errors.experience_level}
                          />
                          <RadioOption
                            value="INTERMEDIATE"
                            label="Intermediate"
                            checked={value === 'INTERMEDIATE'}
                            onChange={() => onChange('INTERMEDIATE')}
                            error={errors.experience_level}
                          />
                          <RadioOption
                            value="ADVANCED"
                            label="Advanced"
                            checked={value === 'ADVANCED'}
                            onChange={() => onChange('ADVANCED')}
                            error={errors.experience_level}
                          />
                        </RadioGroup>
                      )}
                    />
                    <FormError error={errors.experience_level} />
                  </FormField>

                  <FormField>
                    <FormLabel>Dietary Preference</FormLabel>
                    <Select {...register('diet_preference')} error={errors.diet_preference}>
                      <option value="NONE">No Preference</option>
                      <option value="VEGETARIAN">Vegetarian</option>
                      <option value="VEGAN">Vegan</option>
                      <option value="KETO">Keto</option>
                      <option value="PALEO">Paleo</option>
                      <option value="GLUTEN_FREE">Gluten-Free</option>
                      <option value="DAIRY_FREE">Dairy-Free</option>
                    </Select>
                    <FormError error={errors.diet_preference} />
                  </FormField>

                  <FormField>
                    <FormLabel>Medical Conditions / Injuries</FormLabel>
                    <textarea
                      className="flex w-full rounded-lg border border-border/10 bg-background px-3 py-2 text-sm text-gray-100 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                      rows="3"
                      placeholder="Any medical conditions or injuries the trainer should know about"
                      {...register('medical_condition')}
                    />
                    <FormError error={errors.medical_condition} />
                  </FormField>
                </FormSection>
              </div>
            )}

            {/* Navigation Buttons */}
            {!isEditMode ? (
              <div className="flex justify-between pt-6 border-t border-border/10">
                {step > 1 ? (
                  <Button type="button" onClick={prevStep} variant="secondary">
                    Back
                  </Button>
                ) : (
                  <div /> // Spacer
                )}

                {step < 3 ? (
                  <Button type="button" onClick={nextStep}>
                    Next Step
                  </Button>
                ) : (
                  <Button type="submit" isLoading={isLoading}>
                    Complete Setup
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex justify-end pt-6 border-t border-border/10 mt-8">
                <Button type="submit" isLoading={isLoading}>
                  Save Changes
                </Button>
              </div>
            )}

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

export default ProfileForm;