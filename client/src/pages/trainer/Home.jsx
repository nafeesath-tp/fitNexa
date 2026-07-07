import React, { useEffect, useState } from 'react';
import { useTrainerStore } from '../../stores/trainerStore';
import { trainerApi } from '../../services/trainer/trainerApi';
import Avatar from '../../components/ui/Avatar';
import PageLoader from '../../components/ui/PageLoader';
import toast from 'react-hot-toast';

const Home = () => {
  const { profile, setProfile } = useTrainerStore();
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!profile) {
          const response = await trainerApi.getProfile();
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
          name={profile?.first_name || 'Trainer'} 
          size="lg" 
        />
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
            Welcome, {profile?.first_name}!
          </h1>
          <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0' }}>
            Ready for your upcoming sessions?
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Today's Sessions */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Today's Sessions</h2>
          <div style={{ backgroundColor: '#f3f4f6', height: '100px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            No sessions scheduled for today
          </div>
        </div>

        {/* Assigned Clients */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Assigned Clients</h2>
          <div style={{ backgroundColor: '#f3f4f6', height: '100px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            Client List Placeholder
          </div>
        </div>
        
        {/* Upcoming Classes */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Upcoming Classes</h2>
          <div style={{ backgroundColor: '#f3f4f6', height: '100px', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
            Classes Placeholder
          </div>
        </div>

        {/* Wallet */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Wallet & Earnings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#4b5563' }}>Available Balance:</span>
              <span style={{ fontWeight: 'bold', color: '#111827' }}>$0.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#4b5563' }}>Pending Clearance:</span>
              <span style={{ fontWeight: 'bold', color: '#111827' }}>$0.00</span>
            </div>
            <button style={{ 
              marginTop: '1rem',
              backgroundColor: '#111827', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}>
              Withdraw Funds
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;
