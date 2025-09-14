import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, RefreshCw, Eye, Settings, BarChart3 } from 'lucide-react';

const LivingPDFService = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [documents, setDocuments] = useState([
    {
      id: 'doc-123',
      name: 'Listino Prezzi 2025',
      version: '1.2',
      created: '2025-01-15',
      lastUpdate: '2025-02-01',
      downloads: 47,
      viewers: 23,
      status: 'active'
    },
    {
      id: 'doc-456',
      name: 'Manuale Utente',
      version: '2.0',
      created: '2024-12-10',
      lastUpdate: '2025-01-28',
      downloads: 156,
      viewers: 89,
      status: 'active'
    }
  ]);
  
  const [uploadFile, setUploadFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [updateFreq, setUpdateFreq] = useState('manual');
  const fileInputRef = useRef();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadFile(file);
      setDocumentName(file.name.replace('.pdf', ''));
    }
  };

  const createLivingPDF = async () => {
    if (!uploadFile || !documentName) return;
    
    const formData = new FormData();
    formData.append('pdf', uploadFile);
    formData.append('documentName', documentName);
    formData.append('updateFrequency', updateFreq);

    try {
      const response = await fetch('/api/create-living-pdf', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const newDoc = {
          id: result.documentId,
          name: documentName,
          version: result.version,
          created: new Date().toISOString().split('T')[0],
          lastUpdate: new Date().toISOString().split('T')[0],
          downloads: 0,
          viewers: 0,
          status: 'active'
        };
        
        setDocuments([...documents, newDoc]);
        setUploadFile(null);
        setDocumentName('');
        alert('Living PDF creato con successo!');
      } else {
        alert('Errore nella creazione del PDF');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Errore di connessione');
    }
  };

  const updateDocument = (docId) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId ? {
        ...doc, 
        version: (parseFloat(doc.version) + 0.1).toFixed(1),
        lastUpdate: new Date().toISOString().split('T')[0]
      } : doc
    ));
  };

  const downloadPDF = (docId) => {
    window.open(`/api/download/${docId}`, '_blank');
  };

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        activeTab === id 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h1 className="text-3xl font-bold mb-2">Living PDF Service</h1>
          <p className="text-blue-100">Crea PDF che si aggiornano automaticamente</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 p-6 border-b bg-gray-50">
          <TabButton id="upload" label="Crea PDF" icon={Upload} />
          <TabButton id="manage" label="Gestisci" icon={Settings} />
          <TabButton id="analytics" label="Analytics" icon={BarChart3} />
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">Crea nuovo Living PDF</h2>
              
              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PDF da rendere "vivente"
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                    {uploadFile ? (
                      <p className="text-green-600 font-medium">{uploadFile.name}</p>
                    ) : (
                      <p className="text-gray-600">Clicca per selezionare un PDF</p>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Document Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome documento
                  </label>
                  <input
                    type="text"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Es: Listino Prezzi 2025"
                  />
                </div>

                {/* Update Frequency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aggiornamenti
                  </label>
                  <select
                    value={updateFreq}
                    onChange={(e) => setUpdateFreq(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="manual">Manuale</option>
                    <option value="daily">Giornaliero</option>
                    <option value="weekly">Settimanale</option>
                    <option value="monthly">Mensile</option>
                  </select>
                </div>

                {/* Create Button */}
                <button
                  onClick={createLivingPDF}
                  disabled={!uploadFile || !documentName}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Crea Living PDF
                </button>
              </div>

              {/* How it works */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Come funziona:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Il PDF generato include JavaScript invisibile</li>
                  <li>• All'apertura controlla se esistono aggiornamenti</li>
                  <li>• Con JavaScript: scarica automaticamente nuove versioni</li>
                  <li>• Senza JavaScript: mostra la versione originale</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">Gestisci documenti</h2>
              
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText size={24} className="text-blue-600" />
                      <div>
                        <h3 className="font-semibold">{doc.name}</h3>
                        <p className="text-sm text-gray-600">
                          Versione {doc.version} • Creato {doc.created} • Aggiornato {doc.lastUpdate}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status === 'active' ? 'Attivo' : 'Elaborazione...'}
                      </span>
                      
                      <button
                        onClick={() => updateDocument(doc.id)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Aggiorna versione"
                      >
                        <RefreshCw size={18} />
                      </button>
                      
                      <button 
                        onClick={() => downloadPDF(doc.id)}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Scarica PDF"
                      >
                        <Download size={18} />
                      </button>
                      
                      <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded">
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">Analytics</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900">Total Documents</h3>
                  <p className="text-3xl font-bold text-blue-600">{documents.length}</p>
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900">Total Downloads</h3>
                  <p className="text-3xl font-bold text-green-600">
                    {documents.reduce((sum, doc) => sum + doc.downloads, 0)}
                  </p>
                </div>
                
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900">Active Viewers</h3>
                  <p className="text-3xl font-bold text-purple-600">
                    {documents.reduce((sum, doc) => sum + doc.viewers, 0)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Documenti per performance</h3>
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded">
                      <span className="font-medium">{doc.name}</span>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{doc.downloads} downloads</span>
                        <span>{doc.viewers} viewers attivi</span>
                        <span className="text-green-600">v{doc.version}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LivingPDFService;