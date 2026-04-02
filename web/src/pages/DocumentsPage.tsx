import React, { useEffect, useState } from 'react';
import Layout from '../components/common/Layout';
import { documentsApi } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  originalName: string;
  status: string;
  fileSize: number;
  createdAt: string;
  mimeType: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = async () => {
    try {
      const { data } = await documentsApi.list();
      setDocuments(data.documents);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await documentsApi.delete(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  return (
    <Layout title="Documents">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        <Link to="/upload" className="btn-primary">Upload Document</Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : documents.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-5xl mb-4">📄</p>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents yet</h3>
          <p className="text-gray-500 mb-6">Upload your first document to get started</p>
          <Link to="/upload" className="btn-primary">Upload Document</Link>
        </div>
      ) : (
        <div className="card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Size</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Uploaded</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link to={`/documents/${doc.id}`} className="text-blue-600 hover:underline font-medium text-sm">
                      {doc.originalName}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {(doc.fileSize / 1024).toFixed(0)} KB
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <Link to={`/documents/${doc.id}`}
                      className="text-sm text-blue-600 hover:underline">View</Link>
                    <button onClick={() => handleDelete(doc.id, doc.originalName)}
                      className="text-sm text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
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
