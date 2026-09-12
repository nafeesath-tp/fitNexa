import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { subscriptionApi } from '../../services/subscriptionApi';
import { authApi } from '../../services/auth/authApi';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useAuthStore } from '../../stores/authStore';
import { getHomeRoute } from '../../utils/redirectUser';
import toast from 'react-hot-toast';

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const subId = searchParams.get('sub_id');
  const [verifying, setVerifying] = useState(true);
  const { setCurrentSubscription, upsertHistoryItem } = useSubscriptionStore();

  useEffect(() => {
    if (!sessionId) {
      navigate('/client/plans');
      return;
    }

    const verifyPayment = async () => {
      try {
        // Since Stripe webhooks aren't hitting localhost directly, we manually confirm the payment
        // using the sub_id passed in the URL. In production, this would be handled strictly by webhooks.
        if (subId) {
          await subscriptionApi.confirmPayment(subId).catch(() => {});
        }

        const res = await subscriptionApi.getCurrent();
        if (res.success && res.data.payment_status === 'ACTIVE') {
          setCurrentSubscription(res.data);
          upsertHistoryItem(res.data);
          
          // Re-fetch user to update their subscription status in the auth store
          const userRes = await authApi.me().catch(() => null);
          if (userRes && userRes.success) {
            useAuthStore.getState().setAuth(userRes.data);
          }

          setVerifying(false);
          toast.success('Payment successful! Your subscription is now active 🎉');
          
          const currentUser = useAuthStore.getState().user;
          const route = getHomeRoute(currentUser);
          
          setTimeout(() => {
            navigate(route);
          }, 5000);
        } else {
          setVerifying(false);
          toast.error('Payment verification failed. Please contact support.');
          
          const currentUser = useAuthStore.getState().user;
          navigate(getHomeRoute(currentUser));
        }
      } catch (err) {
        setVerifying(false);
        const currentUser = useAuthStore.getState().user;
        navigate(getHomeRoute(currentUser));
      }
    };

    verifyPayment();
  }, [sessionId, subId, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {verifying ? (
        <>
          <Loader2 className="w-16 h-16 animate-spin text-primary mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Verifying your payment...</h1>
          <p className="text-gray-400">Please wait while we confirm your subscription.</p>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-20 h-20 text-green-500 mb-6" />
          <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-gray-400 mb-8 text-center max-w-md">
            Welcome to the FitNexa premium experience. You will be redirected to your dashboard shortly.
          </p>
          <button
            onClick={() => {
              const currentUser = useAuthStore.getState().user;
              navigate(getHomeRoute(currentUser));
            }}
            className="bg-primary hover:bg-primary/90 text-black font-semibold py-3 px-8 rounded-xl transition-all"
          >
            Continue
          </button>
        </>
      )}
    </div>
  );
}
