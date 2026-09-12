import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionApi } from '../../services/subscriptionApi';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import toast from 'react-hot-toast';
import { Check, Crown, Users, Zap, Loader2 } from 'lucide-react';

const PLAN_META = {
  GROUP: {
    icon: Users,
    gradient: 'from-blue-900/40 to-blue-950/40',
    border: 'border-blue-500/30',
    highlight: 'text-blue-400',
    badge: 'Popular',
    buttonStyle: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
  PREMIUM: {
    icon: Crown,
    gradient: 'from-yellow-900/30 to-orange-950/40',
    border: 'border-yellow-500/30',
    highlight: 'text-yellow-400',
    badge: 'Best Value',
    buttonStyle: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold',
  },
};

export default function ClientPlans() {
  const navigate = useNavigate();
  const { plans, setPlans, currentSubscription, setCurrentSubscription, upsertHistoryItem } =
    useSubscriptionStore();

  const [billing, setBilling] = useState('MONTHLY');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null); // plan id being purchased

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, currentRes] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrent().catch(() => ({ success: false })),
      ]);
      if (plansRes.success) setPlans(plansRes.data);
      setCurrentSubscription(currentRes.success ? currentRes.data : null);
    } catch {
      toast.error('Failed to load plans.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (plan) => {
    setPurchasing(plan.id);
    try {
      // Step 1: Create subscription (PENDING)
      const purchaseRes = await subscriptionApi.purchase({
        plan_id: plan.id,
        billing_cycle: billing,
        auto_renew: false,
      });

      if (!purchaseRes.success) {
        toast.error(purchaseRes.message || 'Purchase failed.');
        return;
      }

      // Step 2: Redirect to Stripe Checkout
      if (purchaseRes.url) {
        window.location.href = purchaseRes.url;
      } else {
        toast.error('Failed to initiate payment.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.detail || String(err);
      toast.error(msg);
    } finally {
      setPurchasing(null);
    }
  };

  const isCurrentPlan = (plan) =>
    currentSubscription?.plan?.id === plan.id &&
    currentSubscription?.payment_status === 'ACTIVE';

  // Plan rank: GROUP=1, PREMIUM=2. Upgrade button shows only if the card's rank > current plan's rank.
  const PLAN_RANK = { GROUP: 1, PREMIUM: 2 };
  const isUpgradeable = (plan) => {
    if (!currentSubscription || currentSubscription.payment_status !== 'ACTIVE') return false;
    const currentRank = PLAN_RANK[currentSubscription.plan?.name] ?? 0;
    const cardRank = PLAN_RANK[plan.name] ?? 0;
    return cardRank > currentRank;
  };

  const getButtonLabel = (plan, price, isCurrent) => {
    if (isCurrent) return 'Current Plan';
    if (isUpgradeable(plan)) return 'Upgrade';
    return `Subscribe — $${Number(price).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const savingsPercent = (plan) => {
    if (!plan.price_monthly || !plan.price_yearly) return null;
    const monthly12 = plan.price_monthly * 12;
    const saved = ((monthly12 - plan.price_yearly) / monthly12 * 100).toFixed(0);
    return saved > 0 ? saved : null;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-100 mb-3">
          Choose Your <span className="text-primary">Plan</span>
        </h1>
        <p className="text-muted max-w-xl mx-auto">
          Start free, upgrade when ready. Every plan includes access to the FitNexa platform.
        </p>

        {/* Current subscription banner */}
        {currentSubscription && (
          <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm px-4 py-2 rounded-full">
            <Zap className="w-4 h-4" />
            Current plan: <strong>{currentSubscription.plan?.name}</strong>
            &nbsp;·&nbsp;expires {new Date(currentSubscription.expires_at).toLocaleDateString()}
            &nbsp;·&nbsp;

          </div>
        )}
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-10">
        <div className="flex items-center bg-surface rounded-full p-1 border border-border/20">
          <button
            onClick={() => setBilling('MONTHLY')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${billing === 'MONTHLY'
                ? 'bg-primary text-black'
                : 'text-muted hover:text-gray-200'
              }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('YEARLY')}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${billing === 'YEARLY'
                ? 'bg-primary text-black'
                : 'text-muted hover:text-gray-200'
              }`}
          >
            Yearly
            <span className="ml-1.5 text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
              Save up to 17%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start max-w-4xl mx-auto">
        {plans.filter(p => p.name !== 'FREE').map((plan) => {
          const meta = PLAN_META[plan.name] || PLAN_META.FREE;
          const Icon = meta.icon;
          const price = billing === 'YEARLY' ? plan.price_yearly : plan.price_monthly;
          const perMonth = billing === 'YEARLY' && plan.price_yearly
            ? (plan.price_yearly / 12).toFixed(0)
            : null;
          const savings = billing === 'YEARLY' ? savingsPercent(plan) : null;
          const isCurrent = isCurrentPlan(plan);

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border bg-gradient-to-b ${meta.gradient} ${meta.border} p-6 flex flex-col gap-5 transition-all duration-200 ${plan.name === 'PREMIUM'
                  ? 'shadow-xl shadow-yellow-500/10 ring-1 ring-yellow-500/20 scale-105'
                  : ''
                }`}
            >
              {/* Badge */}
              {meta.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                    {meta.badge}
                  </span>
                </div>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <div className="absolute top-3 right-3">
                  <span className="bg-primary/20 text-primary text-xs font-semibold px-2 py-0.5 rounded-full border border-primary/30">
                    Current
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${meta.highlight}`} />
              </div>

              {/* Name & Price */}
              <div>
                <h2 className={`text-xl font-bold ${meta.highlight} capitalize`}>
                  {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
                </h2>
                <div className="flex items-baseline gap-1 mt-2">
                  {Number(price) === 0 ? (
                    <span className="text-3xl font-bold text-gray-100">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-100">
                        ${Number(price).toLocaleString()}
                      </span>
                      <span className="text-muted text-sm">
                        /{billing === 'YEARLY' ? 'year' : 'month'}
                      </span>
                    </>
                  )}
                </div>
                {perMonth && (
                  <p className="text-xs text-muted mt-0.5">
                    ${Number(perMonth).toLocaleString()}/month billed yearly
                    {savings && (
                      <span className="ml-1 text-green-400">· Save {savings}%</span>
                    )}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check className={`w-4 h-4 ${meta.highlight} shrink-0 mt-0.5`} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => !isCurrent && handlePurchase(plan)}
                disabled={isCurrent || purchasing === plan.id}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${isCurrent
                    ? 'bg-primary/10 text-primary border border-primary/20 cursor-default'
                    : meta.buttonStyle
                  } disabled:opacity-60`}
              >
                {purchasing === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                {getButtonLabel(plan, price, isCurrent)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Subscription history link */}
      <div className="mt-10 text-center">
        <button
          onClick={() => navigate('/client/subscription-history')}
          className="text-muted text-sm hover:text-gray-200 underline underline-offset-2 transition-colors"
        >
          View subscription history →
        </button>
      </div>
    </div>
  );
}
