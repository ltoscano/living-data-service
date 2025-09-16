import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  RefreshCw,
  Link,
  Download,
  X,
  Info,
  List
} from 'lucide-react';
import { documentsApi } from '../services/api';

const FolderTree = ({ 
  items, 
  onSetCurrentVersion,
  onToggleAvailability,
  onOpenUpdateModal,
  onOpenLinkModal,
  onDeleteDocument,
  onDeleteFolder,
  onShowFolderLinks,
  showConfirm,
  level = 0,
  expandedFolders,
  setExpandedFolders
}) => {
  // Use local state only if expandedFolders is not provided (root level)
  const [localExpandedFolders, setLocalExpandedFolders] = useState(new Set());
  const currentExpandedFolders = expandedFolders || localExpandedFolders;
  const currentSetExpandedFolders = setExpandedFolders || setLocalExpandedFolders;

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(currentExpandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    currentSetExpandedFolders(newExpanded);
  };

  // Funzione ricorsiva per raccogliere tutti i file di un folder
  const collectAllFiles = (folderItem) => {
    const files = [];
    
    const collectFromItem = (item, parentPath = '') => {
      if (item.type === 'file') {
        files.push({
          name: item.name,
          url: `${window.location.origin}${item.publicUrl}`,
          path: parentPath ? `${parentPath}/${item.name}` : item.name
        });
      } else if (item.type === 'folder' && item.children) {
        const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;
        item.children.forEach(child => collectFromItem(child, currentPath));
      }
    };
    
    if (folderItem.children) {
      folderItem.children.forEach(child => collectFromItem(child, folderItem.name));
    }
    
    return files;
  };

  const renderItem = (item) => {
    const isExpanded = currentExpandedFolders.has(item.id);
    const paddingLeft = level * 20;

    if (item.type === 'folder') {
      return (
        <div key={item.id} className="mb-2">
          <div 
            className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
            style={{ paddingLeft: `${paddingLeft}px` }}
            onClick={() => toggleFolder(item.id)}
          >
            {item.children && item.children.length > 0 && (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            )}
            {isExpanded ? <FolderOpen size={18} className="text-yellow-600" /> : <Folder size={18} className="text-yellow-600" />}
            <span className="font-medium">{item.name}</span>
            <span className="text-sm text-gray-500">({item.children?.length || 0} items)</span>
            
            {/* Folder actions */}
            <div className="ml-auto flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const files = collectAllFiles(item);
                  onShowFolderLinks && onShowFolderLinks(item.name, files);
                }}
                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Show all links in folder"
              >
                <List size={16} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder && onDeleteFolder(item.id, item.name);
                }}
                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete folder"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {isExpanded && item.children && (
            <div className="ml-4">
              <FolderTree 
                items={item.children}
                onSetCurrentVersion={onSetCurrentVersion}
                onToggleAvailability={onToggleAvailability}
                onOpenUpdateModal={onOpenUpdateModal}
                onOpenLinkModal={onOpenLinkModal}
                onDeleteDocument={onDeleteDocument}
                onDeleteFolder={onDeleteFolder}
                onShowFolderLinks={onShowFolderLinks}
                showConfirm={showConfirm}
                level={level + 1}
                expandedFolders={currentExpandedFolders}
                setExpandedFolders={currentSetExpandedFolders}
              />
            </div>
          )}
        </div>
      );
    } else {
      // File item
      return (
        <div key={item.id} className="mb-2">
          <div 
            className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
            style={{ paddingLeft: `${paddingLeft + 20}px` }}
          >
            <FileText size={18} className="text-blue-600" />
            <div className="flex-1">
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-gray-600">
                Version {item.version} • Created {item.created} • Updated {item.lastUpdate}
              </div>
            </div>
            
            {/* File status and availability */}
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {item.status === 'active' ? 'Active' : 'Processing...'}
              </span>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Available:</span>
                <button
                  onClick={() => onToggleAvailability(item.id, !!item.available)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    !!item.available ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                  title={`Document is ${!!item.available ? 'available' : 'unavailable'} - click to toggle`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      !!item.available ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <button 
                onClick={() => onOpenUpdateModal(item)}
                className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Upload new version"
              >
                <RefreshCw size={16} />
              </button>
              
              <button 
                onClick={() => onOpenLinkModal(item)}
                className="p-1 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                title="View public link"
              >
                <Link size={16} />
              </button>
              
              <button 
                onClick={() => documentsApi.download(item.id)}
                className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                title="Download latest version"
              >
                <Download size={16} />
              </button>
              
              <button 
                onClick={() => onDeleteDocument(item.id, item.name)}
                className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete document"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Available versions section */}
          {item.versions && item.versions.length > 1 && (
            <div className="border-t pt-3 mt-3" style={{ marginLeft: `${paddingLeft + 40}px` }}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Available versions - Click to distribute:
              </h4>
              <div className="flex flex-wrap gap-2">
                {item.versions.map((version) => (
                  <div key={version} className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1">
                    <button
                      onClick={() => onSetCurrentVersion(item.id, version)}
                      className={`text-sm font-medium px-2 py-1 rounded transition-colors ${
                        version === item.version 
                          ? 'bg-green-100 text-green-800 cursor-default' 
                          : 'hover:bg-blue-100 hover:text-blue-800 cursor-pointer'
                      }`}
                      title={version === item.version ? 'Currently distributed version' : `Click to distribute version ${version}`}
                      disabled={version === item.version}
                    >
                      v{version}
                      {version === item.version && (
                        <span className="ml-1 text-xs">✓</span>
                      )}
                    </button>
                    <button
                      onClick={() => documentsApi.downloadVersion(item.id, version)}
                      className="p-1 text-gray-500 hover:text-blue-600"
                      title={`Download version ${version}`}
                    >
                      <Download size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                <Info size={12} className="inline mr-1" />
                The version with ✓ is the one distributed via the public link
              </p>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div>
      {items.map(renderItem)}
    </div>
  );
};

export default FolderTree;