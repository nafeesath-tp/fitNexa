import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { PlayCircle, Activity } from 'lucide-react';
import { Container } from '../../components/ui/LayoutComponents';
import { Card, CardContent } from '../../components/ui/Card';
import Navbar from '../../components/layout/Navbar';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen font-sans bg-background">
      {/* Top Section with Navbar and Hero combined for seamless background */}
      <div className="relative bg-[#0d4727] overflow-hidden rounded-b-[40px]">
        {/* Subtle radial gradients to match the design lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(57,255,20,0.15),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(0,0,0,0.4),_transparent_50%)]" />
        
        <div className="relative z-10">
          <Navbar 
            logoText="" 
            transparent
            borderless
            links={[
              { label: 'Features', path: '#features' },
              { label: 'Pricing', path: '#pricing' },
              { label: 'About', path: '#about' }
            ]} 
            actions={
              <>
                <Link to="/login" className="text-sm font-medium text-gray-200 hover:text-white transition-colors">
                  Log in
                </Link>
                <Button size="sm" onClick={() => navigate('/signup')} className="ml-4 font-bold bg-primary hover:bg-primary-hover text-background px-6 py-2 h-auto rounded-md border-none shadow-[0_0_10px_rgba(57,255,20,0.3)]">
                  Sign Up
                </Button>
              </>
            }
          />
          
          {/* Hero Section */}
          <section className="pt-16 pb-28">
            <Container className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1 space-y-8">
                <div className="inline-flex items-center rounded-full bg-[#0d5d36] px-3 py-1.5 text-xs font-semibold text-[#8bf9aa]">
                  <span className="w-2 h-2 rounded-full bg-primary mr-2 shadow-[0_0_8px_rgba(57,255,20,0.8)]"></span>
                  AI-Powered Fitness 2.0
                </div>
                
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-[4.5rem] leading-[1.15] text-white">
                  Maximize <br/>
                  Potential with <br/>
                  <span className="text-primary drop-shadow-[0_0_15px_rgba(57,255,20,0.3)]">AI-Powered</span> <br/>
                  Fitness <br/>
                  Excellence!
                </h1>
                
                <p className="max-w-lg text-lg text-gray-300 leading-relaxed font-medium">
                  Stop guessing. Start progressing. Get personalized workouts, form feedback, and data-driven results tailored to your physiology.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button size="lg" onClick={() => navigate('/signup')} className="w-full sm:w-auto font-bold px-8 bg-primary hover:bg-primary-hover text-background border-none shadow-[0_0_20px_rgba(57,255,20,0.4)]">
                    Start Your Journey
                  </Button>
                  <Button size="lg" variant="ghost" className="w-full sm:w-auto bg-[#09351d] text-gray-200 border border-[#0d5d36] hover:bg-[#0a4226] px-6">
                    <PlayCircle className="mr-2 h-5 w-5 text-gray-300" />
                    See How It Works
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 pt-8">
                  <div className="flex -space-x-3">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop" alt="User" className="w-10 h-10 rounded-full border-2 border-[#0d4727] object-cover" />
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop" alt="User" className="w-10 h-10 rounded-full border-2 border-[#0d4727] object-cover" />
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" alt="User" className="w-10 h-10 rounded-full border-2 border-[#0d4727] object-cover" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white mb-1">Joined by 10,000+ athletes</p>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-3.5 h-3.5 text-primary fill-current drop-shadow-[0_0_2px_rgba(57,255,20,0.5)]" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 w-full relative pt-8 lg:pt-0">
                {/* Soft glow behind image */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
                
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-white/10 group">
                  {/* Gym Image */}
                  <img 
                    src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" 
                    alt="Gym weights" 
                    className="w-full h-auto object-cover aspect-[4/3] group-hover:scale-105 transition-transform duration-700"
                  />
                  
                  {/* Glassmorphism overlay card */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-4 sm:p-5 flex justify-between items-center shadow-lg">
                      <div>
                        <span className="block text-[11px] text-gray-300 font-medium mb-1">Current Pace</span>
                        <span className="block text-xl sm:text-2xl font-bold text-white tracking-wide">4:32 / km</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[11px] text-gray-300 font-medium mb-1">Heart Rate</span>
                        <span className="block text-xl sm:text-2xl font-bold text-primary tracking-wide">142 BPM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Container>
          </section>
        </div>
      </div>

      {/* Pain points section */}
      <section id="features" className="py-24 bg-surface/30">
        <Container>
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-primary tracking-wider uppercase">The Struggle is Real</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-white">Do these sound familiar to you?</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-white">Why Can't You Achieve Your Goals?</h3>
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
                      <h4 className="font-semibold text-white mb-1">{item.title}</h4>
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
      <footer className="py-12 border-t border-border/10 mt-auto bg-background">
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
