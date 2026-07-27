import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { clientApi } from '../../services/client/clientApi';
import { useClientStore } from '../../stores/clientStore';
import { useAuthStore } from '../../stores/authStore';
import ProfileForm from '../../components/forms/ProfileForm';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const setProfile = useClientStore((state) => state.setProfile);
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

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
        // Mark profile as completed in the auth store so route guards
        // don't redirect the user back to /client/setup.
        setAuth({ ...user, is_profile_completed: true });
        navigate('/client/home', { replace: true });
      } else {
        toast.error(response.message || 'Failed to create profile.');
      }
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.errors && Object.keys(responseData.errors).length > 0) {
        // Show each field error individually
        Object.entries(responseData.errors).forEach(([field, messages]) => {
          const msg = Array.isArray(messages) ? messages[0] : messages;
          toast.error(`${field}: ${msg}`);
        });
      } else {
        toast.error(responseData?.message || responseData?.detail || 'An error occurred during profile setup.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12">
      <ProfileForm 
        onSubmit={onSubmit} 
        isLoading={isLoading} 
        isEditMode={false} 
      />
    </div>
  );
};

export default ProfileSetup;
