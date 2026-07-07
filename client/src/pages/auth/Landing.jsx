import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { CheckCircle2, Activity, PlayCircle, Star, Dumbbell, Utensils, TrendingUp } from 'lucide-react';
import { Container } from '../../components/ui/LayoutComponents';
import { Card, CardContent } from '../../components/ui/Card';
import Navbar from '../../components/layout/Navbar';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background text-gray-100">
      <Navbar 
        logoText="" 
        links={[
          { label: 'Features', path: '#features' },
          { label: 'Pricing', path: '#pricing' },
          { label: 'About', path: '#about' }
        ]} 
        onLogout={null}
        profileData={null}
      />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <Container className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Star className="mr-2 h-4 w-4 fill-primary" />
              AI-Powered Fitness 2.0
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Maximize Potential with <span className="text-primary">AI-Powered</span> Fitness Excellence!
            </h1>
            <p className="max-w-2xl text-lg text-muted">
              Stop guessing. Start progressing. Get personalized workouts, form feedback, and data-driven results tailored to your physiology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" onClick={() => navigate('/signup')} className="w-full sm:w-auto">
                Start Your Journey
              </Button>
              <Button size="lg" variant="ghost" className="w-full sm:w-auto border border-border/10 bg-surface/50">
                <PlayCircle className="mr-2 h-5 w-5" />
                See How It Works
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full border-2 border-background bg-surface flex items-center justify-center text-xs">JD</div>
                <div className="h-8 w-8 rounded-full border-2 border-background bg-surface flex items-center justify-center text-xs">AS</div>
                <div className="h-8 w-8 rounded-full border-2 border-background bg-primary text-background flex items-center justify-center text-xs font-bold">+2k</div>
              </div>
              <p>Joined by 10,000+ athletes</p>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            {/* Abstract visual representation instead of image */}
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-surface to-background border border-border/10 p-6 flex flex-col justify-end shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 w-full h-full opacity-10">
                 <Dumbbell className="w-full h-full text-primary" />
               </div>
               <Card className="bg-background/80 backdrop-blur border-border/10 p-4 w-64 mb-4">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-xs text-muted">Exercise</span>
                   <span className="text-xs text-muted">Heart Rate</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="font-semibold text-lg">Squat</span>
                   <span className="font-semibold text-lg text-primary flex items-center gap-1">
                     <Activity className="h-4 w-4" /> 142 BPM
                   </span>
                 </div>
               </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* Pain points section */}
      <section id="features" className="py-24 bg-surface/30">
        <Container>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary tracking-wider uppercase">The Struggle is Real</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Do these sound familiar to you?</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">Why Can't You Achieve Your Goals?</h3>
              <p className="text-muted leading-relaxed mb-6">
                The old way is broken. Generic PDFs and random YouTube videos don't account for your unique body, schedule, or progress. Identifying these common barriers is the first step to overcoming them with AI.
              </p>
              <div className="h-1 w-12 bg-primary rounded"></div>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Inconsistent Routine', desc: 'Struggling to find the time or motivation to stick to a plan that doesn\'t adapt to you.' },
                { title: 'Confusing Diet Plans', desc: 'Overwhelmed by conflicting nutrition information and calorie counting.' },
                { title: 'Generic Advice', desc: 'Following cookie-cutter programs that ignore your unique physiology and goals.' }
              ].map((item, i) => (
                <Card key={i} className="bg-surface/50 border-border/10">
                  <CardContent className="p-6 flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>
      
      {/* Footer minimal */}
      <footer className="py-12 border-t border-border/10 mt-auto">
        <Container className="flex justify-between items-center flex-col sm:flex-row gap-4 text-sm text-muted">
          <div>© 2026 FitNexa Inc.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default Landing;
