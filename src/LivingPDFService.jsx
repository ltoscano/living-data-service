import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Settings, BarChart3, Link, Copy, Search, X, AlertCircle, CheckCircle, Info, Users, Key, Trash2, Edit3, Plus, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const LivingPDFService = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [manageSubTab, setManageSubTab] = useState('documents');
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting states
  const [sortBy, setSortBy] = useState('created'); // 'title', 'created'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [retentionDays, setRetentionDays] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  // Modal states
  const [modal, setModal] = useState({ show: false, type: 'info', title: '', message: '', onConfirm: null });
  
  // User management states
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalType, setUserModalType] = useState('create'); // create, edit, password
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // Document modals states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [updateFile, setUpdateFile] = useState(null);
  
  const [uploadFile, setUploadFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const fileInputRef = useRef();
  const updateFileRef = useRef();

  // Check auth status on startup
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments();
      loadAnalytics();
      loadRetentionConfig();
      if (user && user.username === 'admin') {
        loadUsers();
      }
    }
  }, [isAuthenticated, user]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        setUser(data.user);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Modal functions
  const showModal = (type, title, message, onConfirm = null) => {
    setModal({ show: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    setModal({ show: false, type: 'info', title: '', message: '', onConfirm: null });
  };

  const showSuccess = (message, onConfirm = null) => {
    showModal('success', 'Success', message, onConfirm);
  };

  const showError = (message) => {
    showModal('error', 'Error', message);
  };

  const showConfirm = (title, message, onConfirm) => {
    showModal('confirm', title, message, onConfirm);
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs.map(doc => ({ ...doc, status: 'active', available: doc.available !== false })));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadRetentionConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const config = await response.json();
        setRetentionDays(config.retentionDays);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      // Fallback to default if API not available
      setRetentionDays(30);
    }
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = documents
    .filter(doc => doc.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'title') {
        comparison = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      } else if (sortBy === 'created') {
        comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadFile(file);
      // Rimuovi l'estensione dal nome del file per il nome del documento
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setDocumentName(nameWithoutExt);
    }
  };

  const createLivingPDF = async () => {
    if (!uploadFile || !documentName) return;
    
    const formData = new FormData();
    formData.append('pdf', uploadFile);
    formData.append('documentName', documentName);
    formData.append('updateFrequency', 'manual'); // Sempre manual

    try {
      const response = await fetch('/api/create-living-pdf', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Reload documents list and analytics dal server
        await loadDocuments();
        await loadAnalytics();
        setUploadFile(null);
        setDocumentName('');
        // Show custom success modal for document creation
        setModal({
          show: true,
          type: 'document-created',
          title: 'Document Created Successfully!',
          message: '',
          publicUrl: result.publicUrl,
          onConfirm: null
        });
      } else {
        showError('Error creating PDF');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Connection error');
    }
  };


  const downloadPDF = (docId) => {
    window.open(`/api/download/${docId}`, '_blank');
  };

  const downloadVersion = (docId, version) => {
    window.open(`/api/download/${docId}/version/${version}`, '_blank');
  };

  const copyPublicLink = async (publicUrl) => {
    const fullUrl = `${window.location.origin}${publicUrl}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      showSuccess('Link copied to clipboard!');
    } catch (err) {
      alert(`Link: ${fullUrl}`);
    }
  };

  const handleUpdateFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUpdateFile(file);
    }
  };

  const uploadNewVersion = async () => {
    if (!updateFile) {
      showError('Please select a file for the new version');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', updateFile);

    try {
      const response = await fetch(`/api/update-document/${selectedDocument.id}`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Reload documents list and analytics dal server
        await loadDocuments();
        await loadAnalytics();

        // Close modal and clear states
        setShowUpdateModal(false);
        setUpdateFile(null);
        setSelectedDocument(null);

        showSuccess(`Document updated to version ${result.version}!`);
      } else {
        showError('Error updating document');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Connection error');
    }
  };

  const setCurrentVersion = async (docId, version) => {
    try {
      const response = await fetch(`/api/set-current-version/${docId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ version })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Reload documents list and analytics
        await loadDocuments();
        await loadAnalytics();
        
        showSuccess(result.message);
      } else {
        showError('Error changing distributed version');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Connection error');
    }
  };

  const toggleAvailability = async (docId, currentAvailable) => {
    try {
      const response = await fetch(`/api/toggle-availability/${docId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ available: !currentAvailable })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Reload documents list and analytics
        await loadDocuments();
        await loadAnalytics();
        
        showSuccess(result.message);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        showError(errorData.error || 'Error changing document availability');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Connection error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setUser(data.user);
        setShowLogin(false);
        setLoginForm({ username: '', password: '' });
      } else {
        showError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('Connection error');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUser(null);
      setDocuments([]);
      setAnalytics(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // User management functions
  const createUser = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('User created successfully!');
        setShowUserModal(false);
        setUserForm({ username: '', password: '', email: '' });
        loadUsers();
      } else {
        showError(data.error || 'Error creating user');
      }
    } catch (error) {
      showError('Connection error');
    }
  };

  const updateUser = async () => {
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('User updated successfully!');
        setShowUserModal(false);
        setUserForm({ username: '', password: '', email: '' });
        loadUsers();
      } else {
        showError(data.error || 'Error updating user');
      }
    } catch (error) {
      showError('Connection error');
    }
  };

  const deleteUser = (userId, username) => {
    showConfirm(
      'Delete User',
      `Are you sure you want to delete user "${username}"? This action cannot be undone.`,
      async () => {
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('User deleted successfully!');
            loadUsers();
          } else {
            const data = await response.json();
            showError(data.error || 'Error deleting user');
          }
        } catch (error) {
          showError('Connection error');
        }
      }
    );
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess('Password changed successfully!');
        setShowUserModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showError(data.error || 'Error changing password');
      }
    } catch (error) {
      showError('Connection error');
    }
  };

  // Delete document function
  const deleteDocument = (docId, docName) => {
    showConfirm(
      'Delete Document',
      `Are you sure you want to delete "${docName}"?\n\nThis will permanently delete the document and all its versions. This action cannot be undone.`,
      async () => {
        try {
          const response = await fetch(`/api/documents/${docId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            showSuccess('Document deleted successfully!');
            // Reload documents list and analytics
            await loadDocuments();
            await loadAnalytics();
          } else {
            const data = await response.json();
            showError(data.error || 'Error deleting document');
          }
        } catch (error) {
          showError('Connection error');
        }
      }
    );
  };

  const openUserModal = (type, user = null) => {
    setUserModalType(type);
    setSelectedUser(user);
    if (user && type === 'edit') {
      setUserForm({ username: user.username, password: '', email: user.email || '' });
    } else {
      setUserForm({ username: '', password: '', email: '' });
    }
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowUserModal(true);
  };

  // Document modal functions
  const openUpdateModal = (document) => {
    setSelectedDocument(document);
    setUpdateFile(null);
    setShowUpdateModal(true);
  };

  const openLinkModal = (document) => {
    setSelectedDocument(document);
    setShowLinkModal(true);
  };

  const closeUpdateModal = () => {
    setShowUpdateModal(false);
    setUpdateFile(null);
    setSelectedDocument(null);
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setSelectedDocument(null);
  };

  // Sorting functions
  const handleSort = (field) => {
    if (sortBy === field) {
      // Se è già lo stesso campo, cambia l'ordine
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Se è un campo diverso, imposta il nuovo campo e ordine predefinito
      setSortBy(field);
      setSortOrder(field === 'title' ? 'asc' : 'desc'); // Titolo default asc, data default desc
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={16} className="text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp size={16} className="text-blue-600" />
      : <ArrowDown size={16} className="text-blue-600" />;
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

  // Modal Component
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
        showSuccess('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
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
                  💡 <strong>Tip:</strong> This link will always serve the latest version of your document. Share it with anyone!
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

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Living Data Service</h1>
              <p className="text-gray-600">Sign in to manage your documents</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In
              </button>
            </form>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Demo credentials:</p>
              <p className="text-sm text-blue-700">Username: admin</p>
              <p className="text-sm text-blue-700">Password: admin123</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 relative">
          <h1 className="text-3xl font-bold mb-2">Living Data Service</h1>
          <p className="text-blue-100">Hassle-free data storage with speed, version control, and secure access</p>
          
          {/* User info and Retention Tag */}
          <div className="absolute top-4 right-6 flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-sm font-medium">👤 {user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-3 py-1 rounded-full text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
            {retentionDays && (
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-sm font-medium">
                  📅 Retention: {retentionDays} days
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 p-6 border-b bg-gray-50">
          <TabButton id="upload" label="Add Data" icon={Upload} />
          <TabButton id="manage" label="Manage" icon={Settings} />
          <TabButton id="analytics" label="Analytics" icon={BarChart3} />
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'upload' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">Add New Data</h2>
              
              <div className="space-y-6">
                {/* File Upload */}
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

                {/* Document Name */}
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


                {/* Create Button */}
                <button
                  onClick={createLivingPDF}
                  disabled={!uploadFile || !documentName}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Upload Document
                </button>
              </div>

              {/* How it works */}
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
          )}

          {activeTab === 'manage' && (
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">Manage</h2>
              
              {/* Sub-navigation */}
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
                  onClick={() => openUserModal('password')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <Key size={18} />
                  Change Password
                </button>
              </div>
              
              {/* Documents Tab */}
              {manageSubTab === 'documents' && (
                <div>
                  {/* Search Bar */}
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
              
              {/* Sorting Controls */}
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
                  {getSortIcon('title')}
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
                  <span className="text-sm">📅</span>
                  Date Created
                  {getSortIcon('created')}
                </button>
              </div>
              
              {/* Scrollable Documents List */}
              <div className="max-h-96 overflow-y-auto space-y-4 border rounded-lg p-4 bg-gray-50">
                {filteredAndSortedDocuments.length > 0 ? filteredAndSortedDocuments.map((doc) => (
                  <div key={doc.id} className="bg-gray-50 rounded-lg p-4">
                    {/* Document header */}
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
                        
                        {/* Availability Toggle */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600">Available:</span>
                          <button
                            onClick={() => toggleAvailability(doc.id, doc.available !== false)}
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
                          onClick={() => openUpdateModal(doc)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Upload new version"
                        >
                          <RefreshCw size={18} />
                        </button>
                        
                        <button 
                          onClick={() => openLinkModal(doc)}
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="View public link"
                        >
                          <Link size={18} />
                        </button>
                        
                        <button 
                          onClick={() => downloadPDF(doc.id)}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Download latest version"
                        >
                          <Download size={18} />
                        </button>
                        
                        <button 
                          onClick={() => deleteDocument(doc.id, doc.name)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete document"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>


                    {/* Available versions section */}
                    {doc.versions && doc.versions.length > 1 && (
                      <div className="border-t pt-4 mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          Available versions - Click to distribute:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {doc.versions.map((version) => (
                            <div key={version} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                              <button
                                onClick={() => setCurrentVersion(doc.id, version)}
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
                                onClick={() => downloadVersion(doc.id, version)}
                                className="p-1 text-gray-500 hover:text-blue-600"
                                title={`Download version ${version}`}
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          💡 The version with ✓ is the one distributed via the public link
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
                </div>
              )}
              
              {/* User Management Tab (Admin Only) */}
              {manageSubTab === 'users' && user && user.username === 'admin' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold">User Management</h3>
                    <button
                      onClick={() => openUserModal('create')}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={18} />
                      Add User
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u) => (
                          <tr key={u.id} className={u.isActive ? '' : 'bg-gray-50 opacity-60'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900">{u.username}</span>
                                {u.username === 'admin' && (
                                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Admin</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {u.email || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(u.created).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openUserModal('edit', u)}
                                  className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                  title="Edit user"
                                >
                                  <Edit3 size={16} />
                                </button>
                                {u.username !== 'admin' && (
                                  <button
                                    onClick={() => deleteUser(u.id, u.username)}
                                    className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                    title="Delete user"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {users.length === 0 && (
                      <div className="text-center py-8">
                        <Users size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">No users found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">Analytics</h2>
              
              {analytics ? (
                <>
                  {/* Main Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-900">Total Documents</h3>
                      <p className="text-3xl font-bold text-blue-600">{analytics.summary.totalDocuments}</p>
                    </div>
                    
                    <div className="bg-green-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-green-900">Total Downloads</h3>
                      <p className="text-3xl font-bold text-green-600">{analytics.summary.totalDownloads}</p>
                    </div>
                    
                    <div className="bg-purple-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-purple-900">Total Versions</h3>
                      <p className="text-3xl font-bold text-purple-600">{analytics.summary.totalVersions}</p>
                    </div>
                    
                    <div className="bg-orange-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-orange-900">Average Versions</h3>
                      <p className="text-3xl font-bold text-orange-600">{analytics.summary.averageVersionsPerDoc}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Most downloaded documents */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Most downloaded documents</h3>
                      <div className="space-y-3">
                        {analytics.topDocuments.length > 0 ? analytics.topDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded">
                            <div>
                              <span className="font-medium">{doc.name}</span>
                              <p className="text-sm text-gray-600">v{doc.currentVersion} • {new Date(doc.created).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-green-600">{doc.downloads}</span>
                              <p className="text-sm text-gray-600">downloads</p>
                            </div>
                          </div>
                        )) : (
                          <p className="text-gray-600 text-center py-4">No documents uploaded yet</p>
                        )}
                      </div>
                    </div>

                    {/* Versions per document */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Version history</h3>
                      <div className="space-y-3">
                        {analytics.documentVersions.length > 0 ? analytics.documentVersions.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded">
                            <div>
                              <span className="font-medium">{doc.name}</span>
                              <p className="text-sm text-gray-600">
                                Current: v{doc.currentVersion} • 
                                {doc.lastVersionDate && ` Last update: ${new Date(doc.lastVersionDate).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-blue-600">{doc.totalVersions}</span>
                              <p className="text-sm text-gray-600">versions</p>
                            </div>
                          </div>
                        )) : (
                          <p className="text-gray-600 text-center py-4">No versions available</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Monthly statistics */}
                  {analytics.monthlyStats.length > 0 && (
                    <div className="mt-8 bg-gray-50 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Monthly statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {analytics.monthlyStats.map((stat, index) => (
                          <div key={index} className="bg-white p-4 rounded text-center">
                            <p className="text-sm font-medium text-gray-600">{stat.month}</p>
                            <p className="text-lg font-bold text-blue-600">{stat.documents}</p>
                            <p className="text-xs text-gray-500">documents</p>
                            <p className="text-sm font-semibold text-green-600">{stat.downloads || 0}</p>
                            <p className="text-xs text-gray-500">download</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading analytics...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Modal */}
      <Modal
        show={modal.show}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        publicUrl={modal.publicUrl}
        onConfirm={modal.onConfirm}
        onClose={closeModal}
      />
      
      {/* User Management Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {userModalType === 'create' && 'Add New User'}
                {userModalType === 'edit' && 'Edit User'}
                {userModalType === 'password' && 'Change Password'}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            {userModalType === 'password' ? (
              <form onSubmit={(e) => { e.preventDefault(); changePassword(); }} className="space-y-4">
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
                    onClick={() => setShowUserModal(false)}
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
              <form onSubmit={(e) => { e.preventDefault(); userModalType === 'create' ? createUser() : updateUser(); }} className="space-y-4">
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
                    disabled={userModalType === 'edit' && selectedUser?.username === 'admin'}
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
                    onClick={() => setShowUserModal(false)}
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
      )}
      
      {/* Update Modal */}
      {showUpdateModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Update Document
              </h3>
              <button
                onClick={closeUpdateModal}
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
                  onClick={closeUpdateModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={uploadNewVersion}
                  disabled={!updateFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Upload New Version
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Link Modal */}
      {showLinkModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Public Link
              </h3>
              <button
                onClick={closeLinkModal}
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
                    onClick={() => copyPublicLink(selectedDocument.publicUrl)}
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
                  onClick={closeLinkModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
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

export default LivingPDFService;