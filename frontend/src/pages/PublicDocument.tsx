import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { documentAPI } from '../api/client';

interface Document {
  _id: string;
  title: string;
  content: string;
  owner: { username: string; email: string };
  createdAt: string;
  updatedAt: string;
}

const PublicDocument: React.FC = () => {
  const { link } = useParams<{ link: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (link) {
      fetchDocument();
    }
  }, [link]);

  const fetchDocument = async () => {
    try {
      const response = await documentAPI.getByPublicLink(link!);
      setDocument(response.data.document);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Document not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {error || 'Document not found'}
          </h2>
          <Link to="/login" className="text-blue-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Shared by {document.owner.username}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="prose max-w-none">
            {document.content ? (
              <pre className="whitespace-pre-wrap font-sans">{document.content}</pre>
            ) : (
              <p className="text-gray-400 italic">Empty document</p>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>This is a read-only view. Sign up to create your own documents!</p>
        </div>
      </main>
    </div>
  );
};

export default PublicDocument;
