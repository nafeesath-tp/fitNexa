import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { trainerApi } from '../../services/trainer/trainerApi';
import { useTrainerStore } from '../../stores/trainerStore';
import TrainerProfileForm from '../../components/forms/TrainerProfileForm';

const Onboarding = () => {
  const navigate = useNavigate();
  const { setProfile, profile } = useTrainerStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await trainerApi.getProfile();
        if (response.success && response.data) {
          // If we have profile data, it means they might be reapplying
          setProfile(response.data);
        }
      } catch (error) {
        // If 404, it just means they haven't onboarded yet, which is fine
        if (error.response?.status !== 404) {
          console.error("Error fetching profile", error);
        }
      } finally {
        setIsFetchingProfile(false);
      }
    };
    
    // Only fetch if we don't have it in store or if it's explicitly rejected
    if (!profile || profile.approval_status === 'REJECTED') {
      fetchProfile();
    } else {
      setIsFetchingProfile(false);
    }
  }, [setProfile, profile]);

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key === 'profile_image' || key === 'certificate') {
          if (data[key] && data[key].length > 0) {
            formData.append(key, data[key][0]);
          }
        } else if (data[key] !== undefined && data[key] !== '') {
          // Flatten specialization id if needed (react-hook-form might pass it as object or string depending on select)
          const value = typeof data[key] === 'object' && data[key]?.id ? data[key].id : data[key];
          formData.append(key, value);
        }
      });

      const response = await trainerApi.submitOnboarding(formData);
      
      if (response.success) {
        toast.success(response.message || 'Application submitted successfully!');
        setProfile({ approval_status: response.data?.approval_status || 'PENDING' });
        navigate('/trainer/pending', { replace: true });
      } else {
        toast.error(response.message || 'Failed to submit application.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'An error occurred during onboarding.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingProfile) {
    return <div className="py-12 flex justify-center text-muted">Loading profile...</div>;
  }

  // Pre-process initial values from profile
  const initialValues = profile ? {
    ...profile,
    specialization: profile.specialization?.id || profile.specialization || '',
  } : {};

  return (
    <div className="py-12 flex justify-center">
      <TrainerProfileForm 
        onSubmit={onSubmit} 
        isLoading={isLoading} 
        isEditMode={!!profile} 
        initialValues={initialValues}
      />
    </div>
  );
};

export default Onboarding;
