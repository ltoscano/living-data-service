import React, { useState, useEffect } from 'react';
import { Plus, Users, Edit3, Trash2, X } from 'lucide-react';
import { usersApi } from '../services/api';

const UsersTab = ({ onOpenUserModal, refreshTrigger }) => {
  const [users, setUsers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const loadUsers = async () => {
    try {
      const userData = await usersApi.getAll();
      setUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleDeleteUser = (userId, username) => {
    setUserToDelete({ userId, username });
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      usersApi.delete(userToDelete.userId)
        .then(() => {
          loadUsers();
          setShowDeleteModal(false);
          setUserToDelete(null);
        })
        .catch(error => {
          console.error('Error deleting user:', error);
          setShowDeleteModal(false);
          setUserToDelete(null);
        });
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleToggleAdmin = async (userId, username, currentAdminStatus) => {
    try {
      // Controlla se è il superuser
      const isSuperuser = username === process.env.REACT_APP_SUPERUSER_NAME || username === 'admincdn';
      if (isSuperuser && currentAdminStatus) {
        alert('Cannot remove admin status from superuser');
        return;
      }

      await usersApi.toggleAdmin(userId, !currentAdminStatus);
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Error toggling admin status:', error);
      alert('Error updating admin status: ' + error.message);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (refreshTrigger) {
      loadUsers();
    }
  }, [refreshTrigger]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">User Management</h3>
        <button
          onClick={() => onOpenUserModal('create')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>
      
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead style={{ backgroundColor: '#fbf7f1' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className={u.isActive ? '' : 'bg-gray-50 opacity-60'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">{u.username}</span>
                    {u.isAdmin && (
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={u.isAdmin}
                      onChange={() => handleToggleAdmin(u.id, u.username, u.isAdmin)}
                      disabled={u.username === 'admincdn'} // Disable for superuser
                      className="sr-only"
                    />
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      u.isAdmin ? 'bg-blue-600' : 'bg-gray-200'
                    } ${u.username === 'admincdn' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          u.isAdmin ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </div>
                    <span className="ml-2 text-xs text-gray-500">
                      {u.username === 'admincdn' ? 'Superuser' : (u.isAdmin ? 'Admin' : 'User')}
                    </span>
                  </label>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenUserModal('edit', u)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                      title="Edit user"
                    >
                      <Edit3 size={16} />
                    </button>
                    {!u.isAdmin && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete User
              </h3>
              <button
                onClick={cancelDeleteUser}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete user <strong>"{userToDelete?.username}"</strong>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteUser}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersTab;