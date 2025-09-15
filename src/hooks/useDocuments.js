import { useState, useEffect } from 'react';
import { documentsApi } from '../services/api';

export const useDocuments = (isAuthenticated) => {
  const [documents, setDocuments] = useState([]);
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

  const createDocument = async (formData) => {
    const result = await documentsApi.create(formData);
    await loadDocuments();
    return result;
  };

  const updateDocument = async (docId, formData) => {
    const result = await documentsApi.update(docId, formData);
    await loadDocuments();
    return result;
  };

  const deleteDocument = async (docId) => {
    await documentsApi.delete(docId);
    await loadDocuments();
  };

  const setCurrentVersion = async (docId, version) => {
    const result = await documentsApi.setCurrentVersion(docId, version);
    await loadDocuments();
    return result;
  };

  const toggleAvailability = async (docId, available) => {
    const result = await documentsApi.toggleAvailability(docId, available);
    await loadDocuments();
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
    }
  }, [isAuthenticated]);

  return {
    documents,
    filteredAndSortedDocuments,
    searchTerm,
    setSearchTerm,
    sortBy,
    sortOrder,
    handleSort,
    createDocument,
    updateDocument,
    deleteDocument,
    setCurrentVersion,
    toggleAvailability,
    loadDocuments
  };
};