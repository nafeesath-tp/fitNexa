import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function CheckoutCancel() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <XCircle className="w-20 h-20 text-red-500 mb-6" />
      <h1 className="text-3xl font-bold text-white mb-2">Payment Cancelled</h1>
      <p className="text-gray-400 mb-8 text-center max-w-md">
        Your subscription payment was cancelled or failed. No charges were made.
      </p>
      <button
        onClick={() => navigate('/client/plans')}
        className="bg-[#1a3a2e] hover:bg-[#234d3d] text-primary border border-primary/20 font-semibold py-3 px-8 rounded-xl transition-all"
      >
        Try Again
      </button>
    </div>
  );
}
