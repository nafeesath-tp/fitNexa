import React, { useEffect, useState } from 'react';
import { useClientStore } from '../../stores/clientStore';
import { clientApi } from '../../services/client/clientApi';
import Avatar from '../../components/ui/Avatar';
import PageLoader from '../../components/ui/PageLoader';
import toast from 'react-hot-toast';

const Home = () => {
  const { profile, setProfile } = useClientStore();
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!profile) {
          const response = await clientApi.getProfile();
          if (response.success) {
            setProfile(response.data);
          }
        }
      } catch (error) {
        toast.error('Failed to load profile data.');
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfile();
  }, [profile, setProfile]);

  if (isFetching) {
    return <PageLoader />;
  }

  // Placeholder styles
  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    marginBottom: '1.5rem'
  };

  return (
    <div>
      {/* Welcome Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        <Avatar 
          image={profile?.profile_image} 
          name={profile?.first_name || 'Client'} 
          size="lg" 
        />
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Welcome back, {profile?.first_name}!
          </h1>
          <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0' }}>
            Ready to crush your {profile?.fitness_goal?.replace('_', ' ').toLowerCase() || 'fitness'} goals today?
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Workout Categories */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Workout Categories</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['Strength', 'Cardio', 'Yoga', 'HIIT'].map(cat => (
              <span key={cat} style={{ 
                backgroundColor: '#eff6ff', 
                color: '#2563eb', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '999px',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Featured Programs */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Featured Programs</h2>
          <div style={{ backgroundColor: '#f3f4f6', height: '100px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            Programs Placeholder
          </div>
        </div>

        {/* Subscription */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Your Subscription</h2>
          <p style={{ color: '#4b5563', marginBottom: '1rem' }}>You are currently on the Free Tier.</p>
          <button style={{ 
            backgroundColor: '#111827', 
            color: 'white', 
            border: 'none', 
            padding: '0.5rem 1rem', 
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}>
            Upgrade Plan
          </button>
        </div>

      </div>
    </div>
  );
};

export default Home;
