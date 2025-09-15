import { useState, useEffect } from 'react';
import { documentsApi, foldersApi } from '../services/api';

export const useDocuments = (isAuthenticated) => {
  const [documents, setDocuments] = useState([]);
  const [folderTree, setFolderTree] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState('desc');

  const loadDocuments = async () => {
    try {
      const docs = await documentsApi.getAll();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadFolderTree = async () => {
    try {
      const tree = await foldersApi.getTree();
      setFolderTree(tree);
    } catch (error) {
      console.error('Error loading folder tree:', error);
    }
  };

  const createDocument = async (formData) => {
    const result = await documentsApi.create(formData);
    await loadDocuments();
    await loadFolderTree();
    return result;
  };

  const createFolder = async (formData) => {
    const result = await foldersApi.create(formData);
    await loadDocuments();
    await loadFolderTree();
    return result;
  };

  const updateDocument = async (docId, formData) => {
    const result = await documentsApi.update(docId, formData);
    await loadDocuments();
    await loadFolderTree();
    return result;
  };

  const deleteDocument = async (docId) => {
    await documentsApi.delete(docId);
    await loadDocuments();
    await loadFolderTree();
  };

  const deleteFolder = async (folderId) => {
    await foldersApi.delete(folderId);
    await loadDocuments();
    await loadFolderTree();
  };

  const setCurrentVersion = async (docId, version) => {
    const result = await documentsApi.setCurrentVersion(docId, version);
    await loadDocuments();
    await loadFolderTree();
    return result;
  };

  const toggleAvailability = async (docId, available) => {
    const result = await documentsApi.toggleAvailability(docId, available);
    await loadDocuments();
    await loadFolderTree();
    return result;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'title' ? 'asc' : 'desc');
    }
  };

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

  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments();
      loadFolderTree();
    }
  }, [isAuthenticated]);

  return {
    documents,
    folderTree,
    filteredAndSortedDocuments,
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
    loadDocuments,
    loadFolderTree
  };
};