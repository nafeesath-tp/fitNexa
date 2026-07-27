import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionApi } from '../../services/subscriptionApi';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import toast from 'react-hot-toast';
import {
  Crown, Star, Users, CheckCircle2, Clock, XCircle,
  AlertCircle, RefreshCw, ArrowUpRight, Loader2, Zap
} from 'lucide-react';

const STATUS_STYLE = {
  ACTIVE:    { label: 'Active',    color: 'text-green-400',  bg: 'bg-green-500/10  border-green-500/20',  icon: CheckCircle2  },
  PENDING:   { label: 'Pending',   color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: Clock         },
  EXPIRED:   { label: 'Expired',   color: 'text-red-400',    bg: 'bg-red-500/10    border-red-500/20',    icon: XCircle       },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-400',   bg: 'bg-gray-500/10   border-gray-500/20',   icon: XCircle       },
  FAILED:    { label: 'Failed',    color: 'text-red-400',    bg: 'bg-red-500/10    border-red-500/20',    icon: AlertCircle   },
};

const PLAN_ICON = { FREE: Star, GROUP: Users, PREMIUM: Crown };

export default function SubscriptionHistory() {
  const navigate = useNavigate();
  const { currentSubscription, setCurrentSubscription, history, setHistory } =
    useSubscriptionStore();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [currentRes, historyRes] = await Promise.all([
        subscriptionApi.getCurrent().catch(() => ({ success: false })),
        subscriptionApi.getHistory(),
      ]);
      if (currentRes.success)  setCurrentSubscription(currentRes.data);
      else                     setCurrentSubscription(null);
      if (historyRes.success)  setHistory(historyRes.data);
    } catch {
      toast.error('Failed to load subscription data.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (sub) => {
    setConfirming(sub.id);
    try {
      const res = await subscriptionApi.confirmPayment(sub.id);
      if (res.success) {
        toast.success('Payment confirmed! Subscription is now active.');
        setCurrentSubscription(res.data);
        await fetchData();
      } else {
        toast.error(res.message || 'Confirmation failed.');
      }
    } catch (err) {
      toast.error(err.response?.data?.errors?.detail || 'Something went wrong.');
    } finally {
      setConfirming(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const ActiveIcon = currentSubscription ? (PLAN_ICON[currentSubscription.plan?.name] || Star) : Star;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">My Subscription</h1>
          <p className="text-muted text-sm mt-1">Manage your plan and view billing history</p>
        </div>
        <button
          onClick={() => navigate('/client/plans')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-sm font-semibold hover:bg-primary/80 transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
          View Plans
        </button>
      </div>

      {/* ── Current Subscription Card ── */}
      {currentSubscription ? (
        <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl p-6 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <ActiveIcon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-100">
                    {currentSubscription.plan?.name} Plan
                  </h2>
                  <span className="flex items-center gap-1 text-xs bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </span>
                </div>
                <p className="text-muted text-sm mt-1">
                  {currentSubscription.billing_cycle === 'YEARLY' ? 'Annual' : 'Monthly'} billing
                  &nbsp;·&nbsp;
                  ₹{Number(currentSubscription.amount_paid).toLocaleString()} paid
                </p>
              </div>
            </div>

            {/* Renewal toggle */}
            <div className="text-right shrink-0">
              <div className="flex items-center gap-2 justify-end">
                <RefreshCw className={`w-4 h-4 ${currentSubscription.auto_renew ? 'text-primary' : 'text-muted'}`} />
                <span className={`text-sm ${currentSubscription.auto_renew ? 'text-primary' : 'text-muted'}`}>
                  {currentSubscription.auto_renew ? 'Auto-renew on' : 'Auto-renew off'}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-primary/10">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Started</p>
              <p className="text-sm text-gray-200 font-medium">
                {currentSubscription.started_at
                  ? new Date(currentSubscription.started_at).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Renews / Expires</p>
              <p className="text-sm text-gray-200 font-medium">
                {currentSubscription.expires_at
                  ? new Date(currentSubscription.expires_at).toLocaleDateString('en-IN', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Features */}
          {currentSubscription.plan?.features?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary/10">
              <p className="text-xs text-muted uppercase tracking-wider mb-2">Included Features</p>
              <div className="grid grid-cols-2 gap-1.5">
                {currentSubscription.plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-sm text-gray-300">
                    <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border/20 rounded-2xl p-8 text-center mb-8">
          <Star className="w-12 h-12 text-muted mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-100 mb-1">No Active Subscription</h2>
          <p className="text-muted text-sm mb-4">Choose a plan to unlock FitNexa features.</p>
          <button
            onClick={() => navigate('/client/plans')}
            className="px-6 py-2.5 bg-primary text-black rounded-xl text-sm font-semibold hover:bg-primary/80 transition-colors"
          >
            Browse Plans
          </button>
        </div>
      )}

      {/* ── History Table ── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Billing History</h2>
        <div className="bg-surface border border-border/20 rounded-2xl overflow-hidden">
          {history.length === 0 ? (
            <div className="text-center py-12 text-muted">No billing history yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border/20">
                <tr>
                  {['Plan', 'Cycle', 'Amount', 'Status', 'Date', 'Expires', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {history.map((sub) => {
                  const st = STATUS_STYLE[sub.payment_status] || STATUS_STYLE.CANCELLED;
                  const StatusIcon = st.icon;
                  const PlanIcon = PLAN_ICON[sub.plan?.name] || Star;
                  return (
                    <tr key={sub.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PlanIcon className="w-4 h-4 text-primary" />
                          <span className="text-gray-200 font-medium">{sub.plan?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted capitalize">
                        {sub.billing_cycle?.toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-gray-200">
                        {Number(sub.amount_paid) === 0 ? 'Free' : `₹${Number(sub.amount_paid).toLocaleString()}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${st.bg} ${st.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(sub.created_at).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {sub.payment_status === 'PENDING' && (
                          <button
                            onClick={() => handleConfirm(sub)}
                            disabled={confirming === sub.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-60"
                          >
                            {confirming === sub.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <CheckCircle2 className="w-3 h-3" />}
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
