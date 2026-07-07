import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { trainerApi } from '../../services/trainer/trainerApi';
import { useTrainerStore } from '../../stores/trainerStore';
import TrainerProfileForm from '../../components/forms/TrainerProfileForm';

const Onboarding = () => {
  const navigate = useNavigate();
  const setProfile = useTrainerStore((state) => state.setProfile);
  const [isLoading, setIsLoading] = useState(false);

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
          formData.append(key, data[key]);
        }
      });

      const response = await trainerApi.submitOnboarding(formData);
      
      if (response.success) {
        toast.success(response.message || 'Application submitted successfully!');
        setProfile({ approval_status: response.data.approval_status });
        navigate('/trainer/pending', { replace: true });
      } else {
        toast.error(response.message || 'Failed to submit application.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred during onboarding.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 flex justify-center">
      <TrainerProfileForm 
        onSubmit={onSubmit} 
        isLoading={isLoading} 
        isEditMode={false} 
      />
    </div>
  );
};

export default Onboarding;
