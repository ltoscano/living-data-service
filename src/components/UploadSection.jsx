import React, { useState, useRef } from 'react';
import { Upload, FileText, Info, Folder } from 'lucide-react';

const UploadSection = ({ onCreateDocument, onCreateFolder, showDocumentCreated, showSuccess, showError }) => {
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFolder, setUploadFolder] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [folderName, setFolderName] = useState('');
  const [uploadType, setUploadType] = useState('file'); // 'file' or 'folder'
  const fileInputRef = useRef();
  const folderInputRef = useRef();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadFile(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setDocumentName(nameWithoutExt);
    }
  };

  const handleFolderUpload = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setUploadFolder(files);
      // Extract folder name from the first file's path
      const firstFile = files[0];
      const pathParts = firstFile.webkitRelativePath.split('/');
      const folderName = pathParts[0];
      setFolderName(folderName);
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

  const createFolder = async () => {
    if (!uploadFolder || !folderName) return;
    
    const formData = new FormData();
    formData.append('folderName', folderName);
    
    // Add all files from the folder
    for (let i = 0; i < uploadFolder.length; i++) {
      const file = uploadFolder[i];
      formData.append('files', file);
      formData.append('filePaths', file.webkitRelativePath);
    }

    try {
      const result = await onCreateFolder(formData);
      setUploadFolder(null);
      setFolderName('');
      const foldersText = result.foldersCreated > 1 ? `${result.foldersCreated} folders and ` : '';
      showSuccess(`Folder "${folderName}" created successfully with ${foldersText}${result.documentsCreated} files!`);
    } catch (error) {
      console.error('Error:', error);
      showError('Error creating folder');
    }
  };

  const handleUpload = () => {
    if (uploadType === 'file') {
      createLivingPDF();
    } else {
      createFolder();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">Add New Data</h2>
      
      {/* Upload Type Selector */}
      <div className="mb-6">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setUploadType('file')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              uploadType === 'file' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FileText size={18} />
            Single File
          </button>
          <button
            onClick={() => setUploadType('folder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              uploadType === 'folder' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Folder size={18} />
            Folder
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {uploadType === 'file' ? (
          <>
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
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder to upload
              </label>
              <div 
                onClick={() => folderInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Folder size={48} className="mx-auto text-gray-400 mb-4" />
                {uploadFolder ? (
                  <div>
                    <p className="text-green-600 font-medium">{folderName}</p>
                    <p className="text-sm text-gray-500">{uploadFolder.length} files selected</p>
                  </div>
                ) : (
                  <p className="text-gray-600">Click to select a folder</p>
                )}
              </div>
              <input
                ref={folderInputRef}
                type="file"
                onChange={handleFolderUpload}
                className="hidden"
                webkitdirectory="true"
                directory="true"
                multiple
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Folder name"
              />
            </div>
          </>
        )}

        <button
          onClick={handleUpload}
          disabled={
            uploadType === 'file' 
              ? (!uploadFile || !documentName)
              : (!uploadFolder || !folderName)
          }
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Upload size={20} />
          {uploadType === 'file' ? 'Upload File' : 'Upload Folder'}
        </button>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Stores any type of file or entire folders with version management</li>
          <li>• Files and folders are managed through unique public links</li>
          <li>• Users can always access the current distributed version</li>
          <li>• Supports PDF, images, documents, and any file format</li>
          <li>• Folder uploads preserve directory structure and hierarchy</li>
          <li>• Secure access control and user isolation</li>
        </ul>
      </div>
    </div>
  );
};

export default UploadSection;