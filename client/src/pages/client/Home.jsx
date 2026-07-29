import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Check, Star } from 'lucide-react';
import { subscriptionApi } from '../../services/subscriptionApi';
import toast from 'react-hot-toast';

export default function Home() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await subscriptionApi.getPlans();
      if (res.success) {
        setPlans(res.data || []);
      }
    } catch (error) {
      console.error('Failed to load plans', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      toast.loading('Processing subscription...');
      const res = await subscriptionApi.createSubscription(planId);
      toast.dismiss();
      if (res.success) {
        toast.success('Subscribed successfully!');
        // Redirect to onboarding profile setup
        navigate('/client/setup');
      } else {
        toast.error(res.message || 'Subscription failed');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Payment failed or cancelled.');
    }
  };

  return (
    <div className="bg-[#0b120f] min-h-screen text-gray-100 font-sans">
      {/* Navbar space is handled by ClientLayout, assuming borderless transparent navbar */}

      {/* HERO SECTION */}
      <section className="pt-24 pb-20 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full mb-8 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>FITNEXA PREMIUM</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
          TRANSFORM YOUR LIFE <br />
          WITH <span className="bg-white text-[#0b120f] px-4 py-1 rounded-lg">FITNEXA STUDIO</span>
        </h1>
        <p className="text-emerald-500/80 mb-10 text-lg max-w-2xl mx-auto">
          Experience the pinnacle of fitness with personalized coaching, AI-driven diets, and a community that pushes you forward.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-8 rounded-full transition-all"
          >
            Get Started
          </button>
          <button className="flex items-center gap-2 bg-transparent border border-emerald-500/30 hover:bg-emerald-500/10 text-white font-bold py-3 px-8 rounded-full transition-all">
            <Play className="w-4 h-4" /> Watch Video
          </button>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-16 px-4 md:px-8 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2">Why Choose FitNexa Studio?</h2>
        <p className="text-sm text-gray-400 mb-10">We provide the best equipment and trainers in the city.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Expert Trainers", desc: "Work with elite professionals who build custom plans." },
            { title: "State-of-the-Art Equipment", desc: "Access the latest technology for maximum results." },
            { title: "Comprehensive Programs", desc: "From diet to workout, we cover every aspect of fitness." }
          ].map((item, i) => (
            <div key={i} className="bg-[#111c17] border border-emerald-900/30 p-8 rounded-2xl">
              <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-lg mb-4">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-24 px-4 md:px-8 max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Choose the Perfect Plan</h2>
        <p className="text-sm text-gray-400 mb-16">Select a plan that suits your fitness goals best.</p>
        
        {loading ? (
          <div className="text-emerald-400">Loading plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            {plans.filter(p => p.name !== 'FREE').map((plan) => {
              const isPremium = plan.name === 'PREMIUM';
              return (
                <div 
                  key={plan.id}
                  className={`relative p-8 rounded-3xl border ${isPremium ? 'border-emerald-500 bg-[#0d2118]' : 'border-emerald-900/30 bg-[#111c17]'} flex flex-col`}
                >
                  {isPremium && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-white">${plan.price}</span>
                    <span className="text-sm text-gray-400">/mo</span>
                  </div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-start gap-3 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      Access to Video Library
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      AI Diet & Workout Plan
                    </li>
                    <li className={`flex items-start gap-3 text-sm ${isPremium ? 'text-gray-300' : 'text-gray-600'}`}>
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isPremium ? 'text-emerald-500' : 'text-gray-600'}`} />
                      1-on-1 Personal Trainer
                    </li>
                  </ul>
                  
                  <button 
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                      isPremium 
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white' 
                        : 'bg-transparent border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    Select Plan
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
