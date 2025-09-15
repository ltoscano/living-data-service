import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  Clock, 
  RefreshCw, 
  Link, 
  Download, 
  X, 
  Info,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  List,
  TreePine
} from 'lucide-react';
import { documentsApi } from '../services/api';
import FolderTree from './FolderTree';

const DocumentsTab = ({ 
  filteredAndSortedDocuments,
  folderTree,
  searchTerm,
  setSearchTerm,
  sortBy,
  sortOrder,
  handleSort,
  getSortIcon,
  onSetCurrentVersion,
  onToggleAvailability,
  onOpenUpdateModal,
  onOpenLinkModal,
  onDeleteDocument,
  onDeleteFolder,
  onShowFolderLinks,
  showConfirm
}) => {
  const [viewType, setViewType] = useState('tree'); // 'list' or 'tree'
  
  const getSortIconComponent = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={16} className="text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp size={16} className="text-blue-600" />
      : <ArrowDown size={16} className="text-blue-600" />;
  };

  const handleDeleteDocument = (docId, docName) => {
    showConfirm(
      'Delete Document',
      `Are you sure you want to delete "${docName}"?\n\nThis will permanently delete the document and all its versions. This action cannot be undone.`,
      () => onDeleteDocument(docId)
    );
  };

  const handleDeleteFolder = (folderId, folderName) => {
    showConfirm(
      'Delete Folder',
      `Are you sure you want to delete folder "${folderName}"?\n\nThis will permanently delete the folder and all its contents. This action cannot be undone.`,
      () => onDeleteFolder(folderId)
    );
  };

  return (
    <div>
      <div className="mb-6">
        <div className="relative max-w-md mx-auto">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {searchTerm && (
          <p className="text-center text-sm text-gray-600 mt-2">
            {filteredAndSortedDocuments.length} document{filteredAndSortedDocuments.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* View Type Selector */}
      <div className="mb-4 flex justify-center gap-2">
        <button
          onClick={() => setViewType('list')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            viewType === 'list' 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
          title="List view"
        >
          <List size={16} />
          List View
        </button>
        
        <button
          onClick={() => setViewType('tree')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            viewType === 'tree' 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
          title="Tree view (folders and files)"
        >
          <TreePine size={16} />
          Tree View
        </button>
      </div>
      
      {/* Sorting Controls - Only show in list view */}
      {viewType === 'list' && (
        <div className="mb-4 flex justify-center gap-2">
          <button
            onClick={() => handleSort('title')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              sortBy === 'title' 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title={`Sort by title ${sortBy === 'title' ? (sortOrder === 'asc' ? '(A-Z)' : '(Z-A)') : ''}`}
          >
            <FileText size={16} />
            Title
            {getSortIconComponent('title')}
          </button>
          
          <button
            onClick={() => handleSort('created')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              sortBy === 'created' 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title={`Sort by creation date ${sortBy === 'created' ? (sortOrder === 'asc' ? '(oldest first)' : '(newest first)') : ''}`}
          >
            <Clock size={16} />
            Date Created
            {getSortIconComponent('created')}
          </button>
        </div>
      )}
      
      <div className="max-h-96 overflow-y-auto border rounded-lg p-4" style={{ backgroundColor: '#fbf7f1' }}>
        {viewType === 'tree' ? (
          // Tree view
          folderTree && folderTree.length > 0 ? (
            <FolderTree
              items={folderTree}
              onSetCurrentVersion={onSetCurrentVersion}
              onToggleAvailability={onToggleAvailability}
              onOpenUpdateModal={onOpenUpdateModal}
              onOpenLinkModal={onOpenLinkModal}
              onDeleteDocument={handleDeleteDocument}
              onDeleteFolder={handleDeleteFolder}
              onShowFolderLinks={onShowFolderLinks}
              showConfirm={showConfirm}
            />
          ) : (
            <div className="text-center py-8">
              <TreePine size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No folders or documents uploaded yet</p>
            </div>
          )
        ) : (
          // List view
          <div className="space-y-4">
            {filteredAndSortedDocuments.length > 0 ? filteredAndSortedDocuments.map((doc) => (
          <div key={doc.id} className="rounded-lg p-4" style={{ backgroundColor: '#fbf7f1' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <FileText size={24} className="text-blue-600" />
                <div>
                  <h3 className="font-semibold">{doc.name}</h3>
                  <p className="text-sm text-gray-600">
                    Version {doc.version} • Created {doc.created} • Updated {doc.lastUpdate}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  doc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {doc.status === 'active' ? 'Active' : 'Processing...'}
                </span>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Available:</span>
                  <button
                    onClick={() => onToggleAvailability(doc.id, doc.available !== false)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      doc.available !== false ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                    title={`Document is ${doc.available !== false ? 'available' : 'unavailable'} - click to toggle`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        doc.available !== false ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <button 
                  onClick={() => onOpenUpdateModal(doc)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Upload new version"
                >
                  <RefreshCw size={18} />
                </button>
                
                <button 
                  onClick={() => onOpenLinkModal(doc)}
                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                  title="View public link"
                >
                  <Link size={18} />
                </button>
                
                <button 
                  onClick={() => documentsApi.download(doc.id)}
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                  title="Download latest version"
                >
                  <Download size={18} />
                </button>
                
                <button 
                  onClick={() => handleDeleteDocument(doc.id, doc.name)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete document"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {doc.versions && doc.versions.length > 1 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Available versions - Click to distribute:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {doc.versions.map((version) => (
                    <div key={version} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                      <button
                        onClick={() => onSetCurrentVersion(doc.id, version)}
                        className={`text-sm font-medium px-2 py-1 rounded transition-colors ${
                          version === doc.version 
                            ? 'bg-green-100 text-green-800 cursor-default' 
                            : 'hover:bg-blue-100 hover:text-blue-800 cursor-pointer'
                        }`}
                        title={version === doc.version ? 'Currently distributed version' : `Click to distribute version ${version}`}
                        disabled={version === doc.version}
                      >
                        v{version}
                        {version === doc.version && (
                          <span className="ml-1 text-xs">✓</span>
                        )}
                      </button>
                      <button
                        onClick={() => documentsApi.downloadVersion(doc.id, version)}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title={`Download version ${version}`}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <Info size={14} className="inline mr-1" />
                  The version with ✓ is the one distributed via the public link
                </p>
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-8">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              {searchTerm 
                ? `No documents found for "${searchTerm}"`
                : 'No documents uploaded yet'
              }
            </p>
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsTab;