import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

import { trainerApi } from '../../services/trainer/trainerApi';
import { useTrainerStore } from '../../stores/trainerStore';
import TrainerProfileForm from '../../components/forms/TrainerProfileForm';
import PageLoader from '../../components/ui/PageLoader';
import { Container, PageHeader } from '../../components/ui/LayoutComponents';

const EditProfile = () => {
  const { profile, setProfile } = useTrainerStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!profile) {
          const response = await trainerApi.getProfile();
          if (response.success) {
            setProfile(response.data);
            
            const data = { ...response.data };
            if (data.specialization && typeof data.specialization === 'object') {
              data.specialization = data.specialization.id;
            }
            setInitialData(data);
          }
        } else {
          const data = { ...profile };
          if (data.specialization && typeof data.specialization === 'object') {
            data.specialization = data.specialization.id;
          }
          setInitialData(data);
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
      
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key === 'profile_image' || key === 'certificate') {
          if (data[key] instanceof FileList && data[key].length > 0) {
            formData.append(key, data[key][0]);
          }
        } else if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });

      toast.error('Update functionality is under construction.');
      
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
    <Container className="py-8">
      <PageHeader 
        title="Edit Profile"
        description="Update your professional details and certifications"
      />
      <div className="mt-8 flex justify-center">
        <TrainerProfileForm 
          initialValues={initialData}
          onSubmit={onSubmit} 
          isLoading={isLoading} 
          isEditMode={true} 
        />
      </div>
    </Container>
  );
};

export default EditProfile;
