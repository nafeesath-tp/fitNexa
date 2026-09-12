import React, { useState, useEffect } from 'react';
import { aiPlansApi } from '../../services/aiPlansApi';
import { Sparkles, Clock, CheckCircle2, XCircle, ArrowRight, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AiPlansReview() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await aiPlansApi.getAllTrainerPlans();
      if (res.success) {
        setPlans(res.data);
      }
    } catch (error) {
      toast.error("Failed to load AI plans");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'PENDING':
      case 'GENERATING':
        return <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Generating</span>;
      case 'GENERATED':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Sparkles className="w-3 h-3"/> Review Needed</span>;
      case 'TRAINER_REVIEWED':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">Reviewed</span>;
      case 'ASSIGNED':
        return <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Assigned</span>;
      case 'GENERATION_FAILED':
        return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle className="w-3 h-3"/> Failed</span>;
      default:
        return <span className="bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Plan Reviews
          </h1>
          <p className="text-sm text-gray-400 mt-1">Review and approve personalized AI plans for your premium clients.</p>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No AI Plans Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            When your premium clients request an AI personalized workout and diet plan, it will appear here for your review.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/50 border-b border-border">
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Week</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Generated On</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{plan.client_email}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <CalendarDays className="w-4 h-4 text-gray-500" />
                        Week {plan.week_number}
                      </div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(plan.status)}
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {new Date(plan.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Link 
                        to={`/trainer/ai-plans/${plan.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:text-white transition-colors"
                      >
                        {plan.status === 'GENERATED' ? 'Review Plan' : 'View Details'}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
