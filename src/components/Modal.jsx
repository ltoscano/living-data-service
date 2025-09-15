import React from 'react';
import { AlertCircle, CheckCircle, Info, Copy } from 'lucide-react';

const Modal = ({ show, type, title, message, publicUrl, onConfirm, onClose }) => {
  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': 
      case 'document-created': 
        return <CheckCircle size={24} className="text-green-600" />;
      case 'error': return <AlertCircle size={24} className="text-red-600" />;
      case 'confirm': return <AlertCircle size={24} className="text-yellow-600" />;
      default: return <Info size={24} className="text-blue-600" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'success': 
      case 'document-created':
        return 'bg-green-600 hover:bg-green-700';
      case 'error': return 'bg-red-600 hover:bg-red-700';
      case 'confirm': return 'bg-yellow-600 hover:bg-yellow-700';
      default: return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicUrl}`);
      // Note: This would need a callback to show success message
      console.log('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[99999]">
      <div className={`bg-white rounded-xl shadow-xl p-6 ${type === 'document-created' ? 'max-w-lg w-full' : 'max-w-md w-full'}`}>
        <div className="flex items-center gap-3 mb-4">
          {getIcon()}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        
        {type === 'document-created' ? (
          <div className="space-y-4">
            <p className="text-gray-600">Your document has been uploaded and is ready for sharing!</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Public sharing link:
              </label>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <code className="text-sm flex-1 break-all text-green-800">
                  {window.location.origin}{publicUrl}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded flex-shrink-0"
                  title="Copy to clipboard"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <Info size={16} className="inline mr-1" />
                <strong>Tip:</strong> This link will always serve the latest version of your document. Share it with anyone!
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${getButtonColor()}`}
              >
                Got it!
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6 whitespace-pre-line">{message}</p>
            
            <div className="flex gap-3 justify-end">
              {type === 'confirm' && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${getButtonColor()}`}
              >
                {type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Modal;