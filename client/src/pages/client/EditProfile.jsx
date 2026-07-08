import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { User, Calendar, Activity, Zap, Mail, Phone, Medal, Award, Edit2 } from 'lucide-react';

import { clientApi } from '../../services/client/clientApi';
import { useClientStore } from '../../stores/clientStore';
import ProfileForm from '../../components/forms/ProfileForm';
import PageLoader from '../../components/ui/PageLoader';
import { Container } from '../../components/ui/LayoutComponents';
import Button from '../../components/ui/Button';

// Helper for displaying readonly fields elegantly
const ReadOnlyField = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col space-y-1.5">
    <label className="text-xs font-medium text-muted px-1">{label}</label>
    <div className="flex items-center justify-between w-full rounded-xl border border-border/10 bg-surface px-4 py-3 text-sm text-gray-100 shadow-sm">
      <span className="truncate">{value || <span className="text-muted/50 italic">Not set</span>}</span>
      {Icon && <Icon className="h-4 w-4 text-primary opacity-80" />}
    </div>
  </div>
);

const EditProfile = () => {
  const { profile, setProfile } = useClientStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [initialData, setInitialData] = useState(null);
  
  // Toggle between view and edit mode
  const [isEditMode, setIsEditMode] = useState(false);

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
      
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (key === 'profile_image') {
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
        setInitialData(response.data);
        setIsEditMode(false); // Go back to view mode after success
      } else {
        toast.error(response.message || 'Failed to update profile.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'An error occurred during profile update.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <PageLoader />;
  }

  return (
    <Container className="py-8">
      
      {/* Profile Header Card */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-border/10 bg-surface/50 p-6 md:p-8 backdrop-blur-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-primary/20 bg-background md:h-28 md:w-28">
              {profile?.profile_image ? (
                <img 
                  src={profile.profile_image} 
                  alt="Profile" 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary bg-primary/10">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </div>
              )}
            </div>
            
            {/* Info */}
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">
                {profile?.first_name} {profile?.last_name}
              </h1>
              <div className="mt-1 flex items-center text-sm text-muted">
                <Mail className="mr-1.5 h-4 w-4" />
                {profile?.email}
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          {!isEditMode && (
            <Button 
              onClick={() => setIsEditMode(true)}
              className="w-full md:w-auto shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_25px_rgba(34,197,94,0.5)] transition-all"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-8 flex justify-center w-full">
        {isEditMode ? (
          <div className="w-full relative">
            <div className="mb-6 flex justify-between items-center w-full max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-white">Edit Information</h2>
              <Button variant="ghost" onClick={() => setIsEditMode(false)} className="text-muted hover:text-white">
                Cancel
              </Button>
            </div>
            <ProfileForm 
              initialValues={initialData}
              onSubmit={onSubmit} 
              isLoading={isLoading} 
              isEditMode={true} 
            />
          </div>
        ) : (
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ReadOnlyField label="First Name" value={profile?.first_name} icon={User} />
            <ReadOnlyField label="Last Name" value={profile?.last_name} icon={User} />
            <ReadOnlyField label="Phone" value={profile?.phone} icon={Phone} />
            <ReadOnlyField label="Date of Birth" value={profile?.date_of_birth} icon={Calendar} />
            <ReadOnlyField label="Experience Level" value={profile?.experience_level?.replace('_', ' ')} icon={Activity} />
            <ReadOnlyField label="Preferred Workout" value={profile?.preferred_workout?.replace('_', ' ')} icon={Zap} />
          </div>
        )}
      </div>

    </Container>
  );
};

export default EditProfile;
