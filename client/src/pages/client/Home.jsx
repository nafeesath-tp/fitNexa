import React, { useEffect, useState } from 'react';
import { useClientStore } from '../../stores/clientStore';
import { clientApi } from '../../services/client/clientApi';
import PageLoader from '../../components/ui/PageLoader';
import { Card, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Container } from '../../components/ui/LayoutComponents';
import toast from 'react-hot-toast';
import { Apple, Activity, Users, Bot, Frown, Utensils, TrendingUp, Quote } from 'lucide-react';

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
    <div className="bg-[#0b0c10] min-h-screen text-gray-100 font-sans pb-16">
      <Container className="py-8 px-4 md:px-8 max-w-7xl mx-auto space-y-24">
        
        {/* HERO SECTION */}
        <section className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-[#0d1f15] to-[#0a1410] border border-primary/10 shadow-2xl shadow-primary/5">
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 flex items-center justify-center pointer-events-none">
            <Apple className="w-[400px] h-[400px] text-primary" />
          </div>
          <div className="relative z-10 p-10 md:p-16 lg:p-24 flex flex-col items-start max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-6 border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span>Best Seller</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-4 tracking-tight">
              Ultimate Whey <br />
              <span className="bg-white text-[#0b0c10] px-2 leading-tight inline-block mt-2">Protein</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-lg">
              Build lean muscle with 20g of premium protein per scoop. Enhanced with digestive enzymes for fast absorption.
            </p>
            <Button size="lg" className="rounded-full px-8 font-bold text-sm tracking-wide">
              Shop Now <span className="ml-2">→</span>
            </Button>
            
            {/* Pagination dots (visual only) */}
            <div className="flex space-x-2 mt-16">
              <div className="w-8 h-1 bg-primary rounded-full"></div>
              <div className="w-2 h-1 bg-gray-600 rounded-full"></div>
              <div className="w-2 h-1 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </section>

        {/* GOALS SECTION */}
        <section className="flex flex-col items-center text-center space-y-12">
          <div className="space-y-3">
            <p className="text-primary font-medium text-sm tracking-wider uppercase">Do these sound familiar to you?</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Can't You Achieve Your Goals?</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <Card className="bg-[#111418] border-none shadow-none hover:bg-[#161a1f] transition-all duration-300">
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                  <Frown className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Lack of Motivation</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Starting is easy, but keeping up with the routine is where most people fail without guidance.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#111418] border-none shadow-none hover:bg-[#161a1f] transition-all duration-300">
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2">
                  <Utensils className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Diet Confusion</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Not knowing what to eat before and after workouts can stall your progress indefinitely.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#111418] border-none shadow-none hover:bg-[#161a1f] transition-all duration-300">
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Hitting a Plateau</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Doing the same exercises repeatedly stops working. You need adaptive progression.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section className="flex flex-col items-center text-center space-y-12">
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight uppercase">OUR SERVICES</h2>
            <p className="text-gray-400">Everything you need to transform your body and mind with the power of AI Virtual Intelligence.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
            {[
              { title: "AI Coach", desc: "Personalized workout plans that adapt to your performance daily.", icon: Bot },
              { title: "Real-time Analytics", desc: "Track every rep, muscle, and milestone with precision metrics.", icon: Activity },
              { title: "Smart Diet", desc: "Nutrition plans generated based on your macros and ultimate goals.", icon: Apple },
              { title: "Community", desc: "Join thousands of like-minded fitness enthusiasts on the same journey.", icon: Users },
            ].map((service, idx) => (
              <Card key={idx} className="bg-[#0e1612] border-none shadow-none hover:bg-[#111b15] transition-all duration-300 text-left">
                <CardContent className="p-8 flex flex-col space-y-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <service.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{service.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{service.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* PREMIUM VERSION CTA */}
        <section className="flex flex-col items-center text-center space-y-8 bg-gradient-to-b from-transparent to-[#0a110e] py-16 rounded-3xl border border-border/5">
          <Badge variant="outline" className="text-primary border-primary/30 px-4 py-1.5 text-xs tracking-widest bg-primary/5 uppercase">Limited Offer</Badge>
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">TRY OUR PREMIUM VERSION</h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Unlock advanced AI insights, unlimited workout generations, and priority support. Take your fitness journey to the next level.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" className="rounded-full px-8 font-bold">
              Go Premium
            </Button>
            <Button size="lg" variant="ghost" className="rounded-full px-8 font-bold border border-gray-700 hover:bg-gray-800">
              View Pricing Plans
            </Button>
          </div>
        </section>

        {/* SUCCESS STORIES */}
        <section className="flex flex-col items-center space-y-12 pb-12 border-b border-border/10">
          <h2 className="text-3xl font-bold text-white tracking-tight">Success Stories</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {[
              { name: "John Doe", role: "Lost 10kg in 3 months", quote: "The AI recovery score changed everything for me. I stopped overtraining and finally started seeing muscle growth." },
              { name: "Anna Smith", role: "Marathon Runner", quote: "Totally seamless to log my runs and diet plan for the week. No other app has this level of intelligence. Highly recommended!" },
              { name: "Mike T.", role: "Strength Athlete", quote: "The interface is clean and the 'Quick Actions' for tracking my meals is a breeze. It's the only fitness app I've stuck with." }
            ].map((story, idx) => (
              <Card key={idx} className="bg-[#111418] border-none shadow-none relative overflow-hidden group">
                <CardContent className="p-8 flex flex-col space-y-6">
                  <Quote className="absolute top-6 right-6 w-12 h-12 text-gray-800 opacity-30 group-hover:text-primary/20 transition-colors duration-500" />
                  <div className="flex items-center space-x-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-400 border border-gray-700">
                      {story.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{story.name}</h4>
                      <p className="text-primary text-xs">{story.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed relative z-10 italic">
                    "{story.quote}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="pt-12 pb-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-1 space-y-6">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-white tracking-tight">Fit<span className="text-primary">Nexa</span></span>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed max-w-xs">
              AI-powered fitness for everyone. Achieve your goals smarter, faster, and better.
            </p>
            <div className="flex space-x-4 text-gray-500">
              <span className="text-xs hover:text-white cursor-pointer transition-colors">Instagram</span>
              <span className="text-xs hover:text-white cursor-pointer transition-colors">Twitter</span>
              <span className="text-xs hover:text-white cursor-pointer transition-colors">LinkedIn</span>
              <span className="text-xs hover:text-white cursor-pointer transition-colors">Facebook</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm">Product</h4>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Success Stories</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Download App</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm">Company</h4>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm">Legal</h4>
            <ul className="space-y-3 text-gray-500 text-sm">
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
            </ul>
          </div>

          <div className="col-span-1 md:col-span-4 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 mt-12 pt-8 border-t border-border/10">
            <p>© 2026 FitNexa Inc. All rights reserved.</p>
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              <span>System is operational</span>
            </div>
          </div>
        </footer>

      </Container>
    </div>
  );
};

export default Home;
