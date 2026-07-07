import React, { useEffect, useState } from 'react';
import { useClientStore } from '../../stores/clientStore';
import { clientApi } from '../../services/client/clientApi';
import Avatar from '../../components/ui/Avatar';
import PageLoader from '../../components/ui/PageLoader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Container } from '../../components/ui/LayoutComponents';
import toast from 'react-hot-toast';
import { Dumbbell, Activity, Calendar, Trophy } from 'lucide-react';

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

  return (
    <Container className="py-8">
      {/* Welcome Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-center gap-6 p-8 rounded-2xl bg-surface border border-border/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 w-64 h-64 opacity-5 pointer-events-none">
           <Trophy className="w-full h-full text-primary" />
        </div>
        <Avatar 
          image={profile?.profile_image} 
          name={profile?.first_name || 'Client'} 
          size="xl"
          className="border-4 border-background shadow-xl"
        />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-100">
            Welcome back, <span className="text-primary">{profile?.first_name}</span>!
          </h1>
          <p className="mt-2 text-lg text-muted max-w-2xl">
            Ready to crush your {profile?.fitness_goal?.replace('_', ' ').toLowerCase() || 'fitness'} goals today? Keep pushing your limits!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Workout Categories */}
        <Card className="hover:border-primary/30 transition-colors group">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="h-5 w-5 text-primary group-hover:animate-bounce" />
              <CardTitle>Workout Categories</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {['Strength', 'Cardio', 'Yoga', 'HIIT', 'Core', 'Mobility'].map(cat => (
                <Badge key={cat} variant="primary" className="text-sm px-3 py-1">
                  {cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Featured Programs */}
        <Card className="hover:border-primary/30 transition-colors group">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-primary group-hover:animate-pulse" />
              <CardTitle>Featured Programs</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-32 rounded-xl bg-surface border border-dashed border-border/20 flex flex-col items-center justify-center text-muted">
              <Calendar className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">New programs dropping soon</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="bg-gradient-to-br from-surface to-background border-primary/20">
          <CardHeader>
            <CardTitle>Your Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <span className="text-3xl font-bold text-white">Free Plan</span>
              <p className="text-sm text-muted mt-1">Basic features included</p>
            </div>
            <Button className="w-full shadow-primary/20">
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>

      </div>
    </Container>
  );
};

export default Home;
