import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { clientApi } from '../../services/client/clientApi';
import { useClientStore } from '../../stores/clientStore';
import ProfileForm from '../../components/forms/ProfileForm';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const setProfile = useClientStore((state) => state.setProfile);
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
