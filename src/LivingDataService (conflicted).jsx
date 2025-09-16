import React, { useState, useEffect } from 'react';
import { Upload, FileText, Settings, BarChart3, Users, Clock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// Custom hooks
import { useAuth } from './hooks/useAuth';
import { useModal } from './hooks/useModal';
import { useDocuments } from './hooks/useDocuments';

// Components
import Modal from './components/Modal';
import TabButton from './components/shared/TabButton';
import UploadSection from './components/UploadSection';
import ManageSection from './components/ManageSection';
import AnalyticsSection from './components/AnalyticsSection';
import FolderLinksModal from './components/FolderLinksModal';
import { UserModal, UpdateModal, LinkModal } from './components/modals';

// Services
import { analyticsApi, configApi, usersApi } from './services/api';
import { copyPublicLink } from './utils';

const LivingDataService = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [retentionDays, setRetentionDays] = useState(null);
  const [version, setVersion] = useState(null);
  
  // Custom hooks
  const { 
    isAuthenticated, 
    user, 
    isLoading, 
    authMethod, 
    keycloakEnabled, 
    login, 
    logout, 
    loginWithKeycloak, 
    changePassword 
  } = useAuth();
  const { 
    modal, 
    showSuccess, 
    showError, 
    showConfirm, 
    showDocumentCreated, 
    closeModal 
  } = useModal();
  
  const {
    filteredAndSortedDocuments,
    folderTree,
    searchTerm,
    setSearchTerm,
    sortBy,
    sortOrder,
    handleSort,
    createDocument,
    createFolder,
    updateDocument,
    deleteDocument,
    deleteFolder,
    setCurrentVersion,
    toggleAvailability,
    loadDocuments
  } = useDocuments(isAuthenticated);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalType, setUserModalType] = useState('create');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', password: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // Document modals states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showFolderLinksModal, setShowFolderLinksModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [updateFile, setUpdateFile] = useState(null);
  const [folderLinksData, setFolderLinksData] = useState({ folderName: '', files: [] });

  // Login state
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Load analytics and config when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadRetentionConfig();
    }
  }, [isAuthenticated]);

  const loadRetentionConfig = async () => {
    try {
      const config = await configApi.get();
      setRetentionDays(config.retentionDays);
      setVersion(config.version);
    } catch (error) {
      console.error('Error loading config:', error);
      setRetentionDays(30);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const result = await login(loginForm);
    if (result.success) {
      setShowLogin(false);
      setLoginForm({ username: '', password: '' });
    } else {
      showError(result.error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // User management functions
  const createUser = async () => {
    try {
      await usersApi.create(userForm);
      showSuccess('User created successfully!');
      setShowUserModal(false);
      setUserForm({ username: '', password: '', email: '' });
    } catch (error) {
      showError(error.message);
    }
  };

  const updateUser = async () => {
    try {
      await usersApi.update(selectedUser.id, userForm);
      showSuccess('User updated successfully!');
      setShowUserModal(false);
      setUserForm({ username: '', password: '', email: '' });
    } catch (error) {
      showError(error.message);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('New passwords do not match');
      return;
    }

    const result = await changePassword(passwordForm);
    if (result.success) {
      showSuccess(result.message);
      setShowUserModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      showError(result.error);
    }
  };

  // Document functions with error handling
  const handleCreateDocument = async (formData) => {
    try {
      const result = await createDocument(formData);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const handleCreateFolder = async (formData) => {
    try {
      const result = await createFolder(formData);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const handleUpdateDocument = async () => {
    if (!updateFile) {
      showError('Please select a file for the new version');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('pdf', updateFile);
      
      const result = await updateDocument(selectedDocument.id, formData);
      
      setShowUpdateModal(false);
      setUpdateFile(null);
      setSelectedDocument(null);
      
      showSuccess(`Document updated to version ${result.version}!`);
    } catch (error) {
      showError('Error updating document');
    }
  };

  const handleSetCurrentVersion = async (docId, version) => {
    try {
      const result = await setCurrentVersion(docId, version);
      showSuccess(result.message);
    } catch (error) {
      showError('Error changing distributed version');
    }
  };

  const handleToggleAvailability = async (docId, currentAvailable) => {
    try {
      const result = await toggleAvailability(docId, !currentAvailable);
      showSuccess(result.message);
    } catch (error) {
      showError('Error changing document availability');
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await deleteDocument(docId);
      showSuccess('Document deleted successfully!');
    } catch (error) {
      showError('Error deleting document');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      await deleteFolder(folderId);
      showSuccess('Folder deleted successfully!');
    } catch (error) {
      showError('Error deleting folder');
    }
  };

  const handleCopyPublicLink = async (publicUrl) => {
    const result = await copyPublicLink(publicUrl);
    if (result.success) {
      showSuccess(result.message);
    }
  };

  // Modal functions
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

  const showFolderLinks = (folderName, files) => {
    setFolderLinksData({ folderName, files });
    setShowFolderLinksModal(true);
  };

  const closeFolderLinksModal = () => {
    setShowFolderLinksModal(false);
    setFolderLinksData({ folderName: '', files: [] });
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={16} className="text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp size={16} className="text-blue-600" />
      : <ArrowDown size={16} className="text-blue-600" />;
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // When clicking Manage tab, automatically select Data subtab is handled in ManageSection
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fbf7f1' }}>
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fbf7f1' }}>
        <div className="max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="inline-block rounded-full p-4 shadow-sm" style={{ backgroundColor: '#fbf7f1' }}>
              <img 
                src="/logo.png" 
                alt="Living Data Service Logo" 
                className="w-64 h-64 object-contain"
              />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Living Data Service</h1>
              <p className="text-gray-600">Sign in to manage your documents</p>
            </div>
            
            {keycloakEnabled ? (
              // Keycloak login
              <div className="space-y-4">
                <button
                  onClick={loginWithKeycloak}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Sign in with Keycloak
                </button>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    Authentication is managed by Keycloak
                  </p>
                </div>
              </div>
            ) : (
              // Local login form
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
            )}
          </div>
        </div>
        
        <Modal
          show={modal.show}
          type={modal.type}
          title={modal.title}
          message={modal.message}
          publicUrl={modal.publicUrl}
          onConfirm={modal.onConfirm}
          onClose={closeModal}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fbf7f1' }}>
      <div className="max-w-6xl mx-auto p-6">
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
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Users size={14} />
                      {user.username}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-3 py-1 rounded-full text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
              {version && (
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-sm font-medium">
                    v{version}
                  </span>
                </div>
              )}
              {retentionDays && (
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Clock size={14} />
                    Retention: {retentionDays} days
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2 p-6 border-b" style={{ backgroundColor: '#fbf7f1' }}>
            <TabButton 
              id="upload" 
              label="Add Data" 
              icon={Upload} 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
            <TabButton 
              id="manage" 
              label="Manage" 
              icon={Settings} 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
            <TabButton 
              id="analytics" 
              label="Analytics" 
              icon={BarChart3} 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
            />
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'upload' && (
              <UploadSection
                onCreateDocument={handleCreateDocument}
                onCreateFolder={handleCreateFolder}
                showDocumentCreated={showDocumentCreated}
                showSuccess={showSuccess}
                showError={showError}
              />
            )}

            {activeTab === 'manage' && (
              <ManageSection
                user={user}
                filteredAndSortedDocuments={filteredAndSortedDocuments}
                folderTree={folderTree}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                sortBy={sortBy}
                sortOrder={sortOrder}
                handleSort={handleSort}
                getSortIcon={getSortIcon}
                onUpdateDocument={handleUpdateDocument}
                onDeleteDocument={handleDeleteDocument}
                onDeleteFolder={handleDeleteFolder}
                onSetCurrentVersion={handleSetCurrentVersion}
                onToggleAvailability={handleToggleAvailability}
                onOpenUpdateModal={openUpdateModal}
                onOpenLinkModal={openLinkModal}
                onOpenUserModal={openUserModal}
                onShowFolderLinks={showFolderLinks}
                showConfirm={showConfirm}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsSection isAuthenticated={isAuthenticated} />
            )}
          </div>
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
      <UserModal
        show={showUserModal}
        userModalType={userModalType}
        selectedUser={selectedUser}
        userForm={userForm}
        setUserForm={setUserForm}
        passwordForm={passwordForm}
        setPasswordForm={setPasswordForm}
        onClose={() => setShowUserModal(false)}
        onCreateUser={createUser}
        onUpdateUser={updateUser}
        onChangePassword={handleChangePassword}
      />
      
      {/* Update Modal */}
      <UpdateModal
        show={showUpdateModal}
        selectedDocument={selectedDocument}
        updateFile={updateFile}
        setUpdateFile={setUpdateFile}
        onClose={closeUpdateModal}
        onUploadNewVersion={handleUpdateDocument}
      />
      
      {/* Link Modal */}
      <LinkModal
        show={showLinkModal}
        selectedDocument={selectedDocument}
        onClose={closeLinkModal}
        onCopyPublicLink={handleCopyPublicLink}
      />
      
      {/* Folder Links Modal */}
      <FolderLinksModal
        show={showFolderLinksModal}
        folderName={folderLinksData.folderName}
        files={folderLinksData.files}
        onClose={closeFolderLinksModal}
        showSuccess={showSuccess}
      />
    </div>
  );
};

export default LivingDataService;