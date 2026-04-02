import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/common/Layout';
import { documentsApi, analysisApi, notarizationApi } from '../services/api';
import toast from 'react-hot-toast';

interface Analysis {
  summary: string;
  riskScore: number;
  risks: Array<{ type: string; severity: string; description: string }>;
  clauses: Array<{ name: string; text: string; explanation: string }>;
  suggestions: Array<{ type: string; description: string; priority: string }>;
  redlines: Array<{ original: string; suggested: string; reason: string }>;
}

interface Document {
  id: string;
  originalName: string;
  status: string;
  fileSize: number;
  createdAt: string;
  s3Url: string;
  ocrText: string | null;
  analysis: Analysis | null;
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'redlines'>('overview');
  const navigate = useNavigate();

  const loadDocument = async () => {
    try {
      const { data } = await documentsApi.get(id!);
      setDocument(data.document);
    } catch {
      toast.error('Failed to load document');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocument(); }, [id]);

  const handleDownload = async () => {
    try {
      const { data } = await documentsApi.download(id!);
      window.open(data.downloadUrl, '_blank');
    } catch {
      toast.error('Failed to get download link');
    }
  };

  const handleRetryAnalysis = async () => {
    try {
      toast.loading('Re-running analysis...');
      await analysisApi.retry(id!);
      toast.dismiss();
      toast.success('Analysis re-started');
      loadDocument();
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.error || 'Failed to retry analysis');
    }
  };

  const handleNotarize = async () => {
    try {
      await notarizationApi.initiate(id!);
      toast.success('Notarization initiated');
      loadDocument();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to initiate notarization');
    }
  };

  if (loading) return <Layout><div className="flex justify-center py-16"><Spinner /></div></Layout>;
  if (!document) return null;

  const analysis = document.analysis;

  return (
    <Layout title={document.originalName}>
      {/* Actions bar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleDownload} className="btn-secondary text-sm">⬇️ Download</button>
        {document.status === 'FAILED' && (
          <button onClick={handleRetryAnalysis} className="btn-secondary text-sm">🔄 Retry Analysis</button>
        )}
        {document.status === 'ANALYZED' && (
          <button onClick={handleNotarize} className="btn-primary text-sm">📝 Notarize</button>
        )}
      </div>

      {/* Document info */}
      <div className="card mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Info label="Status" value={<StatusBadge status={document.status} />} />
          <Info label="Size" value={`${(document.fileSize / 1024).toFixed(0)} KB`} />
          <Info label="Uploaded" value={new Date(document.createdAt).toLocaleDateString()} />
          {analysis && <Info label="Risk Score" value={<RiskBar score={analysis.riskScore} />} />}
        </div>
      </div>

      {/* Tabs */}
      {analysis && (
        <div>
          <div className="flex gap-1 mb-4">
            {(['overview', 'analysis', 'redlines'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg capitalize ${
                  activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                <p className="text-gray-700 text-sm">{analysis.summary}</p>
              </div>
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-3">Risks ({analysis.risks?.length ?? 0})</h4>
                <div className="space-y-2">
                  {analysis.risks?.map((risk, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <SeverityIcon severity={risk.severity} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{risk.type}</p>
                        <p className="text-sm text-gray-600">{risk.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-4">
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-3">Clauses</h4>
                <div className="space-y-3">
                  {analysis.clauses?.map((clause, i) => (
                    <div key={i} className="border-l-4 border-blue-300 pl-4">
                      <p className="text-sm font-semibold text-gray-900">{clause.name}</p>
                      <p className="text-xs text-gray-500 italic mt-1">"{clause.text}"</p>
                      <p className="text-sm text-gray-700 mt-1">{clause.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h4 className="font-semibold text-gray-900 mb-3">Suggestions</h4>
                <div className="space-y-2">
                  {analysis.suggestions?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`font-medium ${
                        s.priority === 'high' ? 'text-red-600' :
                        s.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                      }`}>[{s.priority.toUpperCase()}]</span>
                      <span className="text-gray-700">{s.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'redlines' && (
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-3">Suggested Redlines</h4>
              <div className="space-y-4">
                {analysis.redlines?.map((r, i) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div className="bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-700 mb-1">Original</p>
                      <p className="text-sm text-red-800 line-through">{r.original}</p>
                    </div>
                    <div className="bg-green-50 p-3">
                      <p className="text-xs font-medium text-green-700 mb-1">Suggested</p>
                      <p className="text-sm text-green-800">{r.suggested}</p>
                    </div>
                    <div className="bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {document.status === 'PROCESSING' && (
        <div className="card text-center py-12">
          <Spinner />
          <p className="text-gray-600 mt-4">Analyzing document with AI...</p>
          <p className="text-sm text-gray-400">This may take a minute</p>
        </div>
      )}
    </Layout>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="mt-1">{typeof value === 'string' ? (
        <p className="text-sm font-medium text-gray-900">{value}</p>
      ) : value}</div>
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

function RiskBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700">{score}</span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  const icons: Record<string, string> = {
    critical: '🔴', high: '🟠', medium: '🟡', low: '🟢',
  };
  return <span>{icons[severity] || '⚪'}</span>;
}

function Spinner() {
  return <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />;
}
