import React, { useState } from 'react';
import { FileText, Users, Key } from 'lucide-react';
import DocumentsTab from './DocumentsTab';
import UsersTab from './UsersTab';

const ManageSection = ({ 
  user, 
  filteredAndSortedDocuments,
  folderTree,
  searchTerm,
  setSearchTerm,
  sortBy,
  sortOrder,
  handleSort,
  getSortIcon,
  onUpdateDocument,
  onDeleteDocument,
  onDeleteFolder,
  onSetCurrentVersion,
  onToggleAvailability,
  onOpenUpdateModal,
  onOpenLinkModal,
  onOpenUserModal,
  onShowFolderLinks,
  showConfirm
}) => {
  const [manageSubTab, setManageSubTab] = useState('documents');

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">Manage</h2>
      
      <div className="flex gap-2 justify-center mb-6">
        <button
          onClick={() => setManageSubTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            manageSubTab === 'documents' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FileText size={18} />
          Data
        </button>
        {user && user.username === 'admin' && (
          <button
            onClick={() => setManageSubTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              manageSubTab === 'users' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users size={18} />
            User Management
          </button>
        )}
        <button
          onClick={() => onOpenUserModal('password')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <Key size={18} />
          Change Password
        </button>
      </div>
      
      {manageSubTab === 'documents' && (
        <DocumentsTab
          filteredAndSortedDocuments={filteredAndSortedDocuments}
          folderTree={folderTree}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          sortOrder={sortOrder}
          handleSort={handleSort}
          getSortIcon={getSortIcon}
          onUpdateDocument={onUpdateDocument}
          onDeleteDocument={onDeleteDocument}
          onDeleteFolder={onDeleteFolder}
          onSetCurrentVersion={onSetCurrentVersion}
          onToggleAvailability={onToggleAvailability}
          onOpenUpdateModal={onOpenUpdateModal}
          onOpenLinkModal={onOpenLinkModal}
          onShowFolderLinks={onShowFolderLinks}
          showConfirm={showConfirm}
        />
      )}
      
      {manageSubTab === 'users' && user && user.username === 'admin' && (
        <UsersTab onOpenUserModal={onOpenUserModal} />
      )}
    </div>
  );
};

export default ManageSection;