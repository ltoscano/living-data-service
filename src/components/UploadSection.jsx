import React, { useState, useRef } from 'react';
import { Upload, FileText, Info } from 'lucide-react';

const UploadSection = ({ onCreateDocument, showDocumentCreated, showError }) => {
  const [uploadFile, setUploadFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const fileInputRef = useRef();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadFile(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setDocumentName(nameWithoutExt);
    }
  };

  const createLivingPDF = async () => {
    if (!uploadFile || !documentName) return;
    
    const formData = new FormData();
    formData.append('pdf', uploadFile);
    formData.append('documentName', documentName);
    formData.append('updateFrequency', 'manual');

    try {
      const result = await onCreateDocument(formData);
      setUploadFile(null);
      setDocumentName('');
      showDocumentCreated(result.publicUrl);
    } catch (error) {
      console.error('Error:', error);
      showError('Error creating document');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">Add New Data</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File to upload
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            {uploadFile ? (
              <p className="text-green-600 font-medium">{uploadFile.name}</p>
            ) : (
              <p className="text-gray-600">Click to select a file</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content Name
          </label>
          <input
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Content name"
          />
        </div>

        <button
          onClick={createLivingPDF}
          disabled={!uploadFile || !documentName}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Upload size={20} />
          Upload
        </button>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Stores any type of file with version management</li>
          <li>• Files are managed through unique public links</li>
          <li>• Users can always access the current distributed version</li>
          <li>• Supports PDF, images, documents, and any file format</li>
          <li>• Secure access control and user isolation</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadSection;