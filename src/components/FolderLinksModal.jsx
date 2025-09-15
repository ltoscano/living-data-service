import React from 'react';
import { X, Copy, Download, ExternalLink } from 'lucide-react';

const FolderLinksModal = ({ show, folderName, files, onClose, showSuccess }) => {
  if (!show) return null;

  const copyAllLinks = async () => {
    const linksText = files.map(file => `${file.name}: ${file.url}`).join('\n');
    try {
      await navigator.clipboard.writeText(linksText);
      showSuccess('All links copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy links:', err);
    }
  };

  const downloadLinksFile = () => {
    const linksText = files.map(file => `${file.name}: ${file.url}`).join('\n');
    const blob = new Blob([linksText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}_links.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const copyFileLink = async (fileUrl) => {
    try {
      await navigator.clipboard.writeText(fileUrl);
      showSuccess('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Links in "{folderName}"
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-b bg-gray-50 flex gap-3">
          <button
            onClick={copyAllLinks}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Copy size={16} />
            Copy All Links
          </button>
          <button
            onClick={downloadLinksFile}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Download size={16} />
            Download as TXT
          </button>
          <div className="text-sm text-gray-600 flex items-center">
            {files.length} file{files.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-6">
          {files.length > 0 ? (
            <div className="space-y-3">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {file.name}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {file.path}
                    </div>
                    <div className="text-xs text-blue-600 truncate">
                      {file.url}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyFileLink(file.url)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Copy link"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => window.open(file.url, '_blank')}
                      className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Open link"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No files found in this folder</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderLinksModal;