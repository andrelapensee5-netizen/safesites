import React, { useEffect, useState } from 'react';
import Layout from '../components/common/Layout';
import { subscriptionApi } from '../services/api';
import toast from 'react-hot-toast';

interface SubscriptionStatus {
  status: string;
  isTrialing: boolean;
  trialEndsAt: string | null;
  documentsThisMonth: number;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    Promise.all([
      subscriptionApi.status().then((r) => setSubscription(r.data)),
      subscriptionApi.invoices().then((r) => setPayments(r.data.payments)),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const { data } = await subscriptionApi.checkout(selectedPlan);
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error('Failed to start checkout');
      setCheckoutLoading(false);
    }
  };

  const handleManage = async () => {
    try {
      const { data } = await subscriptionApi.portal();
      window.location.href = data.portalUrl;
    } catch {
      toast.error('Failed to open billing portal');
    }
  };

  if (loading) return <Layout title="Billing"><div className="flex justify-center py-16"><Spinner /></div></Layout>;

  return (
    <Layout title="Billing & Subscription">
      {/* Subscription card */}
      <div className="card mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Subscription Status</h3>
            <div className="flex items-center gap-2 mb-4">
              <StatusBadge status={subscription?.status || 'NONE'} />
              {subscription?.isTrialing && (
                <span className="text-sm text-yellow-600">
                  Trial ends {subscription.trialEndsAt
                    ? new Date(subscription.trialEndsAt).toLocaleDateString()
                    : 'soon'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-medium text-gray-900">SafeSite Pro</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Documents This Month</p>
                <p className="font-medium text-gray-900">
                  {subscription?.documentsThisMonth ?? 0} / 15
                  {(subscription?.documentsThisMonth ?? 0) > 15 && (
                    <span className="text-yellow-600 text-xs ml-1">(2x rate after 15)</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {(!subscription?.status || subscription.status === 'TRIALING' || subscription.status === 'CANCELED') ? (
              <button onClick={handleSubscribe} disabled={checkoutLoading} className="btn-primary">
                {checkoutLoading ? 'Loading...' : 'Subscribe Now'}
              </button>
            ) : (
              <button onClick={handleManage} className="btn-secondary">Manage Subscription</button>
            )}
          </div>
        </div>

        {/* Plan selector (shown when not yet active) */}
        {(!subscription?.status || subscription.status === 'TRIALING' || subscription.status === 'CANCELED') && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Choose Your Plan</h4>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedPlan === 'monthly'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedPlan('annual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedPlan === 'annual'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                Annual
                <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  Save 33%
                </span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PricingCard
                title="Monthly"
                price="$49"
                period="/month"
                description="Billed monthly. Cancel anytime."
                selected={selectedPlan === 'monthly'}
                onSelect={() => setSelectedPlan('monthly')}
              />
              <PricingCard
                title="Annual"
                price="$399"
                period="/year"
                description="Billed once a year. That's $33.25/mo — save $189."
                selected={selectedPlan === 'annual'}
                onSelect={() => setSelectedPlan('annual')}
                badge="Best Value"
              />
            </div>
          </div>
        )}

        {/* Pricing info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">What's Included</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PricingItem
              title="15 Documents / month"
              price="Included"
              description="AI analysis, OCR, and risk scoring on every document"
            />
            <PricingItem
              title="Extra Documents"
              price="2x rate"
              description="After 15 documents, usage is charged at double the rate"
            />
            <PricingItem
              title="Free Trial"
              price="1 day free"
              description="Try with up to 3 documents, no credit card required for signup"
            />
          </div>
        </div>
      </div>

      {/* Payment history */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
        {payments.length === 0 ? (
          <p className="text-gray-500 text-sm">No payments yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Description</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 px-3 text-sm text-gray-600">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-3 text-sm text-gray-700">{p.description}</td>
                  <td className="py-2 px-3 text-sm font-medium text-gray-900">
                    ${(p.amount / 100).toFixed(2)} {p.currency.toUpperCase()}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'SUCCEEDED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    TRIALING: 'bg-yellow-100 text-yellow-700',
    PAST_DUE: 'bg-red-100 text-red-700',
    CANCELED: 'bg-gray-100 text-gray-700',
    NONE: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function PricingCard({
  title, price, period, description, selected, onSelect, badge,
}: {
  title: string; price: string; period: string; description: string;
  selected: boolean; onSelect: () => void; badge?: string;
}) {
  return (
    <div
      onClick={onSelect}
      className={`relative rounded-lg p-5 border-2 cursor-pointer transition-colors ${
        selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      {badge && (
        <span className="absolute top-3 right-3 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {price}<span className="text-sm font-normal text-gray-500">{period}</span>
      </p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}

function PricingItem({ title, price, description }: { title: string; price: string; description: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xl font-bold text-blue-600 my-1">{price}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function Spinner() {
  return <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />;
}
