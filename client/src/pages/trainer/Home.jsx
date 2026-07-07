import React, { useEffect, useState } from 'react';
import { useTrainerStore } from '../../stores/trainerStore';
import { trainerApi } from '../../services/trainer/trainerApi';
import Avatar from '../../components/ui/Avatar';
import PageLoader from '../../components/ui/PageLoader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Container } from '../../components/ui/LayoutComponents';
import toast from 'react-hot-toast';
import { Users, CalendarDays, Wallet, Activity } from 'lucide-react';

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

  return (
    <Container className="py-8">
      {/* Welcome Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center gap-6 p-8 rounded-2xl bg-surface border border-border/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 w-64 h-64 opacity-5 pointer-events-none">
           <Activity className="w-full h-full text-primary" />
        </div>
        <Avatar 
          image={profile?.profile_image} 
          name={profile?.first_name || 'Trainer'} 
          size="xl"
          className="border-4 border-background shadow-xl" 
        />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100">
            Welcome, <span className="text-primary">{profile?.first_name}</span>!
          </h1>
          <p className="mt-2 text-lg text-muted max-w-2xl">
            Ready for your upcoming sessions? Let's empower some clients today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Today's Sessions */}
        <Card className="hover:border-primary/30 transition-colors group">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-5 w-5 text-primary group-hover:animate-pulse" />
              <CardTitle>Today's Sessions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-32 rounded-xl bg-surface border border-dashed border-border/20 flex flex-col items-center justify-center text-muted">
              <p className="text-sm font-medium">No sessions scheduled for today</p>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Clients */}
        <Card className="hover:border-primary/30 transition-colors group">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary group-hover:animate-bounce" />
              <CardTitle>Assigned Clients</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-32 rounded-xl bg-surface border border-dashed border-border/20 flex flex-col items-center justify-center text-muted">
              <p className="text-sm font-medium">Client List Placeholder</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Upcoming Classes */}
        <Card className="hover:border-primary/30 transition-colors group">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-primary group-hover:animate-pulse" />
              <CardTitle>Upcoming Classes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-32 rounded-xl bg-surface border border-dashed border-border/20 flex flex-col items-center justify-center text-muted">
              <p className="text-sm font-medium">Classes Placeholder</p>
            </div>
          </CardContent>
        </Card>

        {/* Wallet */}
        <Card className="bg-gradient-to-br from-surface to-background border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Wallet & Earnings</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center pb-4 border-b border-border/10">
                <span className="text-muted">Available Balance:</span>
                <span className="text-2xl font-bold text-white">$0.00</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-muted">Pending Clearance:</span>
                <span className="font-semibold text-gray-300">$0.00</span>
              </div>
              <Button className="w-full shadow-primary/20">
                Withdraw Funds
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </Container>
  );
};

export default Home;
