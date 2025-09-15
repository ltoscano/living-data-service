// Auth API
export const authApi = {
  checkStatus: async () => {
    const response = await fetch('/api/auth/status');
    return await response.json();
  },

  login: async (credentials) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return { response, data: await response.json() };
  },

  logout: async () => {
    return await fetch('/api/logout', { method: 'POST' });
  },

  changePassword: async (passwordData) => {
    const response = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordData)
    });
    return { response, data: await response.json() };
  }
};

// Documents API
export const documentsApi = {
  getAll: async () => {
    const response = await fetch('/api/documents');
    if (response.ok) {
      const docs = await response.json();
      return docs.map(doc => ({ ...doc, status: 'active', available: doc.available !== false }));
    }
    throw new Error('Failed to load documents');
  },

  create: async (formData) => {
    const response = await fetch('/api/create-living-pdf', {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to create document');
  },

  update: async (docId, formData) => {
    const response = await fetch(`/api/update-document/${docId}`, {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to update document');
  },

  delete: async (docId) => {
    const response = await fetch(`/api/documents/${docId}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      return true;
    }
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete document');
  },

  setCurrentVersion: async (docId, version) => {
    const response = await fetch(`/api/set-current-version/${docId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version })
    });
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to set current version');
  },

  toggleAvailability: async (docId, available) => {
    const response = await fetch(`/api/toggle-availability/${docId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ available })
    });
    if (response.ok) {
      return await response.json();
    }
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to toggle availability');
  },

  download: (docId) => {
    window.open(`/api/download/${docId}`, '_blank');
  },

  downloadVersion: (docId, version) => {
    window.open(`/api/download/${docId}/version/${version}`, '_blank');
  }
};

// Users API
export const usersApi = {
  getAll: async () => {
    const response = await fetch('/api/users');
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to load users');
  },

  create: async (userData) => {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    }
    throw new Error(data.error || 'Failed to create user');
  },

  update: async (userId, userData) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await response.json();
    if (response.ok) {
      return data;
    }
    throw new Error(data.error || 'Failed to update user');
  },

  delete: async (userId) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      return true;
    }
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete user');
  }
};

// Analytics API
export const analyticsApi = {
  get: async () => {
    const response = await fetch('/api/analytics');
    if (response.ok) {
      return await response.json();
    }
    throw new Error('Failed to load analytics');
  }
};

// Config API
export const configApi = {
  get: async () => {
    const response = await fetch('/api/config');
    if (response.ok) {
      return await response.json();
    }
    // Fallback to default if API not available
    return { retentionDays: 30, version: null };
  }
};