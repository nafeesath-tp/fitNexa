import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

import { clientApi } from '../../services/client/clientApi';
import { useClientStore } from '../../stores/clientStore';
import ProfileForm from '../../components/forms/ProfileForm';
import PageLoader from '../../components/ui/PageLoader';

const EditProfile = () => {
  const { profile, setProfile } = useClientStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!profile) {
          const response = await clientApi.getProfile();
          if (response.success) {
            setProfile(response.data);
            setInitialData(response.data);
          }
        } else {
          setInitialData(profile);
        }
      } catch (error) {
        toast.error('Failed to load profile data.');
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfile();
  }, [profile, setProfile]);

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);
      
      // Convert to FormData to handle potential image upload
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key === 'profile_image') {
          // Only append if it's a new FileList with a file
          if (data.profile_image instanceof FileList && data.profile_image.length > 0) {
            formData.append('profile_image', data.profile_image[0]);
          }
        } else if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });

      const response = await clientApi.updateProfile(formData);
      
      if (response.success) {
        toast.success(response.message || 'Profile updated successfully!');
        setProfile(response.data);
        // Stay on page
      } else {
        toast.error(response.message || 'Failed to update profile.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred during profile update.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <PageLoader />;
  }

  return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
      <ProfileForm 
        initialValues={initialData}
        onSubmit={onSubmit} 
        isLoading={isLoading} 
        isEditMode={true} 
      />
    </div>
  );
};

export default EditProfile;
