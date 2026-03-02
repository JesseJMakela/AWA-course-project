// Dashboard page — shows the user's documents and images, allows creating/deleting and uploading
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentAPI, fileAPI } from '../api/client';

interface DocumentItem {
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

interface DriveImage {
  _id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  createdAt: string;
}

type Tab = 'documents' | 'images';

const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('documents');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [images, setImages] = useState<DriveImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<DriveImage | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
    fetchImages();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await documentAPI.getAll();
      setDocuments(response.data.documents);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    try {
      const response = await fileAPI.getImages();
      setImages(response.data.images);
    } catch {
      // non-critical
    }
  };

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

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentAPI.delete(id);
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await fileAPI.uploadImage(file);
      await fetchImages();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Delete this image?')) return;
    try {
      await fileAPI.deleteImage(id);
      setImages(prev => prev.filter(img => img._id !== id));
      if (previewImage?._id === id) setPreviewImage(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete image');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      await fileAPI.uploadAvatar(file);
      await refreshUser();
      setShowAvatarModal(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await fileAPI.deleteAvatar();
      await refreshUser();
      setShowAvatarModal(false);
    } catch {
      setError('Failed to remove avatar');
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fi-FI', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
            <div className="flex items-center gap-4">
              {/* Avatar button */}
              <button
                onClick={() => setShowAvatarModal(true)}
                className="relative group focus:outline-none"
                title="Change profile picture"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Profile"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-purple-300 group-hover:ring-purple-500 transition"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center ring-2 ring-purple-300 group-hover:ring-purple-500 transition">
                    <span className="text-purple-700 font-semibold text-sm">
                      {user?.username?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 bg-purple-600 rounded-full p-0.5">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold ml-4">×</button>
          </div>
        )}

        {/* Tabs + Action button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTab('documents')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'documents' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              📄 Documents
              {documents.length > 0 && <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">{documents.length}</span>}
            </button>
            <button
              onClick={() => setTab('images')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'images' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
            >
              🖼️ Images
              {images.length > 0 && <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">{images.length}</span>}
            </button>
          </div>

          {tab === 'documents' ? (
            <button
              onClick={() => setShowNewDocModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Document
            </button>
          ) : (
            <>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </>
          )}
        </div>

        {/* DOCUMENTS TAB */}
        {tab === 'documents' && (
          documents.length === 0 ? (
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
                    <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">{doc.title}</h3>
                    {doc.isOwner && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc._id); }}
                        className="text-red-600 hover:text-red-800 ml-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{doc.content || 'Empty document'}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{doc.isOwner ? 'Owner' : doc.canEdit ? 'Editor' : 'Viewer'}</span>
                    <span>{formatDate(doc.updatedAt)}</span>
                  </div>
                  {!doc.isOwner && <div className="mt-2 text-xs text-gray-500">by {doc.owner.username}</div>}
                </div>
              ))}
            </div>
          )
        )}

        {/* IMAGES TAB */}
        {tab === 'images' && (
          images.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No images</h3>
              <p className="mt-1 text-sm text-gray-500">Upload your first image to the drive.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img) => (
                <div
                  key={img._id}
                  className="group relative bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setPreviewImage(img)}
                >
                  <div className="aspect-square">
                    <img src={img.url} alt={img.originalName} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-gray-700 truncate font-medium">{img.originalName}</p>
                    <p className="text-xs text-gray-400">{formatSize(img.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteImage(img._id); }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    title="Delete"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )
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
                <button type="button" onClick={() => { setShowNewDocModal(false); setNewDocTitle(''); }} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-xl font-semibold mb-6 text-center">Profile Picture</h3>
            <div className="flex justify-center mb-6">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover ring-4 ring-purple-200" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center ring-4 ring-purple-200">
                  <span className="text-purple-700 font-bold text-3xl">{user?.username?.[0]?.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {avatarUploading ? 'Uploading...' : user?.avatar ? 'Change Picture' : 'Upload Picture'}
              </button>
              {user?.avatar && (
                <button onClick={handleRemoveAvatar} className="w-full bg-red-50 text-red-600 border border-red-200 py-2 px-4 rounded-lg hover:bg-red-100 transition">
                  Remove Picture
                </button>
              )}
              <button onClick={() => setShowAvatarModal(false)} className="w-full text-gray-600 border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage.url} alt={previewImage.originalName} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain" />
            <div className="mt-3 flex items-center justify-between text-white text-sm px-1">
              <span>{previewImage.originalName} · {formatSize(previewImage.size)}</span>
              <div className="flex gap-3">
                <a href={previewImage.url} download={previewImage.originalName} className="bg-white text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-100 transition text-xs font-medium" onClick={(e) => e.stopPropagation()}>
                  Download
                </a>
                <button onClick={() => { const id = previewImage._id; setPreviewImage(null); handleDeleteImage(id); }} className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition text-xs font-medium">
                  Delete
                </button>
                <button onClick={() => setPreviewImage(null)} className="bg-gray-700 text-white px-3 py-1 rounded-lg hover:bg-gray-600 transition text-xs font-medium">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
