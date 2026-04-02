import React, { useEffect, useState } from 'react';
import Layout from '../components/common/Layout';
import { documentsApi, subscriptionApi } from '../services/api';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../utils/store';

interface Document {
  id: string;
  originalName: string;
  status: string;
  fileSize: number;
  createdAt: string;
  analysis?: { riskScore: number };
}

interface SubscriptionStatus {
  status: string;
  isTrialing: boolean;
  trialEndsAt: string | null;
  documentsThisMonth: number;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      documentsApi.list().then((r) => setDocuments(r.data.documents.slice(0, 5))),
      subscriptionApi.status().then((r) => setSubscription(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Dashboard"><Spinner /></Layout>;

  return (
    <Layout title="Dashboard">
      {/* Welcome */}
      <div className="mb-6">
        <h3 className="text-lg text-gray-700">
          Welcome back, <span className="font-semibold">{user?.firstName}</span>!
        </h3>
      </div>

      {/* Trial banner */}
      {subscription?.isTrialing && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-yellow-800">You're on a free trial</p>
            <p className="text-sm text-yellow-700">
              Trial ends {subscription.trialEndsAt
                ? new Date(subscription.trialEndsAt).toLocaleDateString()
                : 'soon'}
            </p>
          </div>
          <Link to="/billing" className="btn-primary text-sm">Upgrade Now</Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard label="Documents This Month" value={subscription?.documentsThisMonth ?? 0} icon="📄" />
        <StatCard label="Subscription" value={subscription?.status ?? 'N/A'} icon="💳" />
        <StatCard label="Total Documents" value={documents.length} icon="📁" />
      </div>

      {/* Recent documents */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Documents</h3>
          <Link to="/documents" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No documents yet</p>
            <Link to="/upload" className="btn-primary">Upload your first document</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Link key={doc.id} to={`/documents/${doc.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{doc.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()} ·{' '}
                      {(doc.fileSize / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={doc.status} />
                  {doc.analysis && (
                    <RiskBadge score={doc.analysis.riskScore} />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="card flex items-center gap-4">
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ANALYZED: 'bg-green-100 text-green-700',
    PROCESSING: 'bg-yellow-100 text-yellow-700',
    PENDING: 'bg-gray-100 text-gray-700',
    FAILED: 'bg-red-100 text-red-700',
    NOTARIZED: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function RiskBadge({ score }: { score: number }) {
  const level = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  const colors = { High: 'text-red-600', Medium: 'text-yellow-600', Low: 'text-green-600' };
  return (
    <span className={`text-xs font-medium ${colors[level]}`}>
      Risk: {score}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}
