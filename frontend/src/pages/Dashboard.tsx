// Dashboard page — shows the user's documents and allows creating/deleting them
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentAPI } from '../api/client';

interface Document {
  _id: string;
  title: string;
  content: string;
  owner: { _id: string; username: string; email: string };
  isOwner: boolean;
  canEdit: boolean;
  canView: boolean;
  updatedAt: string;
  createdAt: string;
  isPublic: boolean;
  publicLink?: string;
}

const Dashboard: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Load documents when the component mounts
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Fetch all documents the current user can access
  const fetchDocuments = async () => {
    try {
      const response = await documentAPI.getAll();
      setDocuments(response.data.documents);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Create a new document and refresh the list
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    try {
      await documentAPI.create(newDocTitle);
      setNewDocTitle('');
      setShowNewDocModal(false);
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create document');
    }
  };

  // Delete a document after confirmation
  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentAPI.delete(id);
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cloud Drive</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome, {user?.username}!</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800">My Documents</h2>
          <button
            onClick={() => setShowNewDocModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Document
          </button>
        </div>

        {/* Documents Grid */}
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new document.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer"
                onClick={() => navigate(`/document/${doc._id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
                    {doc.title}
                  </h3>
                  {doc.isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc._id);
                      }}
                      className="text-red-600 hover:text-red-800 ml-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {doc.content || 'Empty document'}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{doc.isOwner ? 'Owner' : doc.canEdit ? 'Editor' : 'Viewer'}</span>
                  <span>{formatDate(doc.updatedAt)}</span>
                </div>

                {!doc.isOwner && (
                  <div className="mt-2 text-xs text-gray-500">
                    by {doc.owner.username}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Document Modal */}
      {showNewDocModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Create New Document</h3>
            <form onSubmit={handleCreateDocument}>
              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Document title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewDocModal(false);
                    setNewDocTitle('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
