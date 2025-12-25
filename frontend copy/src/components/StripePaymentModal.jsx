import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { CreditCard, RefreshCw, X } from 'lucide-react';

const CheckoutForm = ({ clientSecret, onSuccess, onError, amount, transactionNumber }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message);
      onError(error.message);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Payment successful!');
      onSuccess(paymentIntent);
      setIsProcessing(false);
    } else {
      setMessage('Payment processing...');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <LinkAuthenticationElement
          onChange={(e) => setEmail(e.value.email)}
          options={{
            defaultValues: {
              email: email,
            }
          }}
        />
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'link'],
            fields: {
              billingDetails: {
                email: 'auto',
              }
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.includes('successful') 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Pay ₹{amount}
            </>
          )}
        </button>

        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>Powered by Stripe</p>
          <p className="text-slate-500">
            Supports: Card, Link, UPI (PhonePe, Google Pay, Paytm)
          </p>
        </div>
      </div>
    </form>
  );
};

const StripePaymentModal = ({ 
  isOpen, 
  onClose, 
  amount, 
  transactionId, 
  transactionNumber,
  onSuccess,
  stripePublishableKey 
}) => {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stripePublishableKey) {
      setStripePromise(loadStripe(stripePublishableKey));
    }
  }, [stripePublishableKey]);

  useEffect(() => {
    if (isOpen && transactionId) {
      createPaymentIntent();
    }
  }, [isOpen, transactionId]);

  const createPaymentIntent = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:2060'}/api/payments/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          amount: amount,
          payment_method_types: ['card', 'link']
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setClientSecret(data.client_secret);
      } else {
        setError(data.detail || 'Failed to create payment intent');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (paymentIntent) => {
    onSuccess(paymentIntent);
    onClose();
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
  };

  if (!isOpen) return null;

  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#3b82f6',
      colorBackground: '#0f172a',
      colorText: '#e2e8f0',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '12px',
    },
    rules: {
      '.Input': {
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        color: '#e2e8f0',
      },
      '.Input:focus': {
        border: '1px solid #3b82f6',
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
      },
      '.Label': {
        color: '#cbd5e1',
        fontWeight: '500',
      },
      '.Tab': {
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        color: '#94a3b8',
      },
      '.Tab--selected': {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: '1px solid #3b82f6',
      },
    },
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Stripe Payment</h2>
            <p className="text-sm text-slate-400 mt-1">
              Transaction: {transactionNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-slate-400">Initializing payment...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              <button
                onClick={createPaymentIntent}
                className="w-full py-3 rounded-xl bg-slate-700 text-white font-semibold hover:bg-slate-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : clientSecret && stripePromise ? (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance,
                loader: 'auto',
              }}
            >
              <CheckoutForm
                clientSecret={clientSecret}
                onSuccess={handleSuccess}
                onError={handleError}
                amount={amount}
                transactionNumber={transactionNumber}
              />
            </Elements>
          ) : null}
        </div>

        <div className="p-4 bg-slate-800/50 rounded-b-2xl border-t border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Secure payment powered by Stripe</span>
            <span className="font-semibold text-white">₹{amount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripePaymentModal;
