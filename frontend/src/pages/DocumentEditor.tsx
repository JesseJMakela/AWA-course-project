// Document editor with optimistic locking:
// - clicking Edit acquires a server-side lock (10 min expiry)
// - lock expires automatically so a closed tab never permanently blocks others
// - auto-saves every 10 seconds while editing
// - beforeunload warns the user if there are unsaved changes
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useAuth } from '../context/AuthContext';
import { documentAPI, getApiError } from '../api/client';

interface Document {
  _id: string;
  title: string;
  content: string;
  owner: { _id: string; username: string; email: string };
  isOwner: boolean;
  canEdit: boolean;
  canView: boolean;
  isPublic: boolean;
  publicLink?: string;
  editPermissions: Array<{ _id: string; username: string; email: string }>;
  viewPermissions: Array<{ _id: string; username: string; email: string }>;
  currentlyEditingBy?: { _id: string; username: string; email: string } | null;
  editLockExpiry?: string | null;
}

const DocumentEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [lockWarning, setLockWarning] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'edit' | 'view'>('view');
  const [publicLink, setPublicLink] = useState('');

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);

  useEffect(() => {
    // Set up a 10-second auto-save interval while the user is in editing mode.
    // The interval is cleared when editing stops or when the component unmounts.
    if (isEditing && document?.canEdit) {
      const interval = setInterval(handleSave, 10000);
      return () => clearInterval(interval);
    }
  }, [isEditing, document, title, content]);

  // Warn before closing if editing
  useEffect(() => {
    /**
     * beforeunload handler: if the user tries to close or navigate away while
     * still in editing mode, the browser shows a confirmation dialog.
     * This reduces accidental data loss for users who close the tab without
     * clicking "Done Editing" (the lock will expire on the server after 10 min).
     */
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditing]);

  /** Fetch the document from the API and populate local state. */
  const fetchDocument = async () => {
    try {
      const response = await documentAPI.getById(id!);
      const doc = response.data.document;
      setDocument(doc);
      setTitle(doc.title);
      setContent(doc.content);
      setPublicLink(doc.publicLink || '');

      // Check if locked by someone else
      if (doc.currentlyEditingBy && 
          doc.currentlyEditingBy._id !== user?._id &&
          doc.editLockExpiry &&
          new Date(doc.editLockExpiry) > new Date()) {
        setLockWarning(`This document is currently being edited by ${doc.currentlyEditingBy.username}`);
      }
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to load document'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Acquire the edit lock and switch the UI into editing mode.
   *
   * Calls POST /api/documents/:id/lock.  The server grants a 10-minute lock.
   * If another user already holds an unexpired lock, the API returns 423 and
   * the username of the current editor is shown as a warning.
   */
  const handleStartEditing = async () => {
    if (!document?.canEdit) return;

    try {
      await documentAPI.lock(id!);
      setIsEditing(true);
      setLockWarning('');
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to start editing'));
      if (isAxiosError(err) && err.response?.data?.editedBy) {
        setLockWarning(`Document is being edited by ${err.response.data.editedBy as string}`);
      }
    }
  };

  /**
   * Save the current content and release the edit lock.
   * Called when the user clicks "Done Editing".
   */
  const handleStopEditing = async () => {
    if (!isEditing) return;

    try {
      await handleSave();
      await documentAPI.unlock(id!);
      setIsEditing(false);
    } catch (err: unknown) {
      console.error('Failed to stop editing:', err);
    }
  };

  /** Save the current title and content to the server (PUT /api/documents/:id). */
  const handleSave = async () => {
    if (!document?.canEdit || saving) return;

    setSaving(true);
    try {
      await documentAPI.update(id!, { title, content });
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to save document'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Share the document with a user by e-mail.
   * The selected permission ('edit' or 'view') is sent to
   * POST /api/documents/:id/share.
   */
  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    try {
      await documentAPI.share(id!, [shareEmail], sharePermission);
      setShareEmail('');
      setShowShareModal(false);
      fetchDocument();
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to share document'));
    }
  };

  /** Remove all access for a specific user from this document. */
  const handleRemovePermission = async (userId: string) => {
    try {
      await documentAPI.removePermission(id!, userId);
      fetchDocument();
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to remove permission'));
    }
  };

  /** Generate a random public link so the document can be read without logging in. */
  const handleGeneratePublicLink = async () => {
    try {
      const response = await documentAPI.generatePublicLink(id!);
      setPublicLink(response.data.publicLink);
      fetchDocument();
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to generate public link'));
    }
  };

  /** Disable public access and delete the public link stored on the document. */
  const handleRemovePublicLink = async () => {
    try {
      await documentAPI.removePublicLink(id!);
      setPublicLink('');
      fetchDocument();
    } catch (err: unknown) {
      setError(getApiError(err, 'Failed to remove public link'));
    }
  };

  /** Build the full public URL and copy it to the user's clipboard. */
  const copyPublicLink = () => {
    const url = `${window.location.origin}/public/${publicLink}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Document not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-semibold border-b-2 border-blue-500 focus:outline-none flex-1 min-w-0"
                />
              ) : (
                <h1 className="text-xl font-semibold text-gray-900 truncate flex-1">{title}</h1>
              )}
              {saving && <span className="text-sm text-gray-500">Saving...</span>}
            </div>

            <div className="flex gap-2 flex-wrap">
              {document.canEdit && !isEditing && (
                <button
                  onClick={handleStartEditing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  Edit
                </button>
              )}
              {isEditing && (
                <button
                  onClick={handleStopEditing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                >
                  Done Editing
                </button>
              )}
              {document.isOwner && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                >
                  Share
                </button>
              )}
            </div>
          </div>

          {lockWarning && (
            <div className="mt-3 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm">
              {lockWarning}
            </div>
          )}

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              placeholder="Start typing..."
            />
          ) : (
            <div className="prose max-w-none">
              {content ? (
                <pre className="whitespace-pre-wrap font-sans">{content}</pre>
              ) : (
                <p className="text-gray-400 italic">Empty document</p>
              )}
            </div>
          )}
        </div>

        {/* Document Info */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Document Information</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Owner:</span> {document.owner.username} ({document.owner.email})</p>
            <p><span className="font-medium">Your access:</span> {document.isOwner ? 'Owner' : document.canEdit ? 'Editor' : 'Viewer'}</p>
            {document.isPublic && (
              <p><span className="font-medium">Public:</span> Yes</p>
            )}
          </div>

          {/* Permissions */}
          {document.isOwner && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Shared with:</h4>
              
              {document.editPermissions.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Editors:</p>
                  <div className="space-y-2">
                    {document.editPermissions.map((user) => (
                      <div key={user._id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span className="text-sm">{user.username} ({user.email})</span>
                        <button
                          onClick={() => handleRemovePermission(user._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {document.viewPermissions.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Viewers:</p>
                  <div className="space-y-2">
                    {document.viewPermissions.map((user) => (
                      <div key={user._id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                        <span className="text-sm">{user.username} ({user.email})</span>
                        <button
                          onClick={() => handleRemovePermission(user._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Link */}
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-semibold mb-3">Public Link:</h4>
                {publicLink ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/public/${publicLink}`}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={copyPublicLink}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                    <button
                      onClick={handleRemovePublicLink}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove public access
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleGeneratePublicLink}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Generate Public Link
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Share Document</h3>
            <form onSubmit={handleShare}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Email
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permission
                </label>
                <select
                  value={sharePermission}
                  onChange={(e) => setSharePermission(e.target.value as 'edit' | 'view')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEmail('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Share
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
