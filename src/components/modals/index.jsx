import React, { useState, useRef } from 'react';
import { X, Copy } from 'lucide-react';

export const UserModal = ({ 
  show, 
  userModalType, 
  selectedUser, 
  userForm, 
  setUserForm, 
  passwordForm, 
  setPasswordForm, 
  onClose, 
  onCreateUser, 
  onUpdateUser, 
  onChangePassword 
}) => {
  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userModalType === 'password') {
      onChangePassword();
    } else if (userModalType === 'create') {
      onCreateUser();
    } else {
      onUpdateUser();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {userModalType === 'create' && 'Add New User'}
            {userModalType === 'edit' && 'Edit User'}
            {userModalType === 'password' && 'Change Password'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        {userModalType === 'password' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Change Password
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={userModalType === 'edit' && selectedUser?.isAdmin}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {userModalType === 'create' ? 'Password' : 'New Password (leave empty to keep current)'}
              </label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required={userModalType === 'create'}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {userModalType === 'create' ? 'Create User' : 'Update User'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const UpdateModal = ({ 
  show, 
  selectedDocument, 
  updateFile, 
  setUpdateFile, 
  onClose, 
  onUploadNewVersion 
}) => {
  const updateFileRef = useRef();

  const handleUpdateFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUpdateFile(file);
    }
  };

  if (!show || !selectedDocument) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Update Document
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Uploading a new version for: <strong>{selectedDocument.name}</strong>
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select new file
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={updateFileRef}
                type="file"
                onChange={handleUpdateFileSelect}
                className="hidden"
              />
              <button
                onClick={() => updateFileRef.current?.click()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-left text-sm"
              >
                {updateFile ? updateFile.name : 'Click to select file...'}
              </button>
            </div>
            {updateFile && (
              <p className="text-xs text-gray-500 mt-1">
                Selected: {updateFile.name}
              </p>
            )}
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onUploadNewVersion}
              disabled={!updateFile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Upload New Version
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LinkModal = ({ show, selectedDocument, onClose, onCopyPublicLink }) => {
  if (!show || !selectedDocument) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Public Link
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Public link for: <strong>{selectedDocument.name}</strong>
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share this link (always serves the current distributed version):
            </label>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <code className="text-sm flex-1 break-all">
                {window.location.origin}{selectedDocument.publicUrl}
              </code>
              <button
                onClick={() => onCopyPublicLink(selectedDocument.publicUrl)}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded flex-shrink-0"
                title="Copy to clipboard"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This link always serves the current distributed version (v{selectedDocument.version}). 
              When you set a different version as current, this link will automatically serve the new version.
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};