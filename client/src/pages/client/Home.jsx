import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, BookOpen, TrendingUp, Cpu, BarChart2, Apple, Users, ArrowRight } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0b120f] min-h-screen text-gray-100 font-sans pb-20">
      {/* Top Banner (Ultimate Whey Protein Placeholder) */}
      <section className="px-4 pt-10 pb-16 max-w-7xl mx-auto">
        <div className="relative w-full rounded-3xl bg-gradient-to-br from-[#122e20] to-[#0d1f15] p-10 md:p-16 flex flex-col md:flex-row items-center justify-between overflow-hidden border border-emerald-900/40">
          <div className="z-10 max-w-lg">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3 block">✦ Just Arrived</span>
            <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight">
              Ultimate Whey <br />
              <span className="bg-white text-[#0b120f] px-2 leading-snug">Protein</span>
            </h1>
            <p className="text-gray-400 mb-8 max-w-sm text-sm leading-relaxed">
              Power your workouts with 25g of pure protein per scoop. Enhanced with digestive enzymes for fast absorption.
            </p>
            <button className="bg-emerald-500 hover:bg-emerald-400 text-[#0b120f] font-bold py-3 px-8 rounded-full transition-all flex items-center gap-2 text-sm">
              Shop Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="hidden md:block absolute right-10 top-1/2 -translate-y-1/2 opacity-10">
            <Apple className="w-96 h-96 text-emerald-500" strokeWidth={0.5} />
          </div>
          
          <div className="mt-8 flex gap-2">
             <div className="w-8 h-1 bg-emerald-500 rounded-full"></div>
             <div className="w-2 h-1 bg-gray-600 rounded-full"></div>
             <div className="w-2 h-1 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Can't Achieve Your Goals? */}
      <section className="py-16 px-4 max-w-6xl mx-auto text-center">
        <span className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest mb-2 block">The Struggle is Real</span>
        <h2 className="text-2xl font-bold text-white mb-12">Can't You Achieve Your Goals?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111c17] border border-emerald-900/30 p-8 rounded-2xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-3">Lack of Motivation</h3>
            <p className="text-xs text-gray-500 leading-relaxed text-center">
              Starting is easy, but staying consistent is the hardest part. Find your drive with FitNexa's guidance.
            </p>
          </div>
          
          <div className="bg-[#111c17] border border-emerald-900/30 p-8 rounded-2xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6 border border-yellow-500/20">
              <BookOpen className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-3">Diet Confusion</h3>
            <p className="text-xs text-gray-500 leading-relaxed text-center">
              Too many fads, too little facts. We clear the noise with science-backed nutrition plans just for you.
            </p>
          </div>
          
          <div className="bg-[#111c17] border border-emerald-900/30 p-8 rounded-2xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-3">Hitting a Plateau</h3>
            <p className="text-xs text-gray-500 leading-relaxed text-center">
              Taking 10,000 steps but still seeing zero change? We break the cycle and keep you growing.
            </p>
          </div>
        </div>
      </section>

      {/* Our Services */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-white mb-4 tracking-tight">OUR SERVICES</h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Everything you need to transform your body and mind, powered by AI and expert intelligence.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Cpu, title: 'AI Coach', desc: 'Personalized workouts that adapt as you evolve and progress.', color: 'emerald' },
            { icon: BarChart2, title: 'Real-Time Analytics', desc: 'Track your gains, lifts, and milestones with precision tracking.', color: 'blue' },
            { icon: Apple, title: 'Smart Diet', desc: 'Nutrition plans generated based on your biometric data and goals.', color: 'orange' },
            { icon: Users, title: 'Community', desc: 'Join thousands of like-minded fitness enthusiasts on the same path.', color: 'purple' }
          ].map((srv, i) => (
            <div key={i} className="bg-[#111c17] border border-emerald-900/20 p-6 rounded-2xl hover:border-emerald-500/30 transition-colors">
              <div className={`w-10 h-10 rounded-lg bg-${srv.color}-500/10 flex items-center justify-center mb-4 text-${srv.color}-400`}>
                <srv.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white mb-2">{srv.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{srv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Try Premium Version */}
      <section className="py-24 px-4 max-w-4xl mx-auto text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
          Premium
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">TRY OUR PREMIUM VERSION</h2>
        <p className="text-gray-400 mb-10 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Unlock advanced AI insights, unlimited workout generations, and priority support. Take your fitness journey to the next level.
        </p>
        <div className="flex items-center justify-center gap-4">

          <button 
            onClick={() => navigate('/client/plans')}
            className="bg-transparent border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 font-bold py-3 px-8 rounded-full transition-all text-sm"
          >
            View Pricing Plans
          </button>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-12">Success Stories</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'John Doe', role: 'Lost 20 lbs in 3 months', quote: "FitNexa completely changed how I train. The AI insights kept me accountable and I finally broke my plateau." },
            { name: 'Jane Smith', role: 'Marathon Runner', quote: "The smart diet feature is a lifesaver. It adjusts exactly to my training load, making sure I never run out of energy." },
            { name: 'Mike R.', role: 'Gained 10 lbs muscle', quote: "I've never been stronger. The analytics show me exactly how I'm progressing week over week. Truly revolutionary." }
          ].map((story, i) => (
            <div key={i} className="bg-[#111c17] border border-emerald-900/30 p-8 rounded-2xl relative">
              <div className="absolute top-8 right-8 text-emerald-900 opacity-30">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/></svg>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  {story.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{story.name}</div>
                  <div className="text-xs text-emerald-500/70">{story.role}</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed italic">"{story.quote}"</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Footer Area Placeholder */}
      <footer className="mt-20 border-t border-border/10 pt-10 pb-4 max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-xs text-muted">
         <div className="flex items-center gap-2 mb-4 md:mb-0">
             <span className="font-bold text-white tracking-widest text-sm">FITNEXA</span>
         </div>
         <div className="flex gap-6">
             <a href="#" className="hover:text-emerald-400 transition-colors">Platform</a>
             <a href="#" className="hover:text-emerald-400 transition-colors">Company</a>
             <a href="#" className="hover:text-emerald-400 transition-colors">Legal</a>
         </div>
      </footer>
    </div>
  );
}
