import { useState } from 'react';

export const useModal = () => {
  const [modal, setModal] = useState({ 
    show: false, 
    type: 'info', 
    title: '', 
    message: '', 
    publicUrl: '', 
    onConfirm: null 
  });

  const showModal = (type, title, message, onConfirm = null, publicUrl = '') => {
    setModal({ show: true, type, title, message, onConfirm, publicUrl });
  };

  const closeModal = () => {
    setModal({ show: false, type: 'info', title: '', message: '', onConfirm: null, publicUrl: '' });
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

  const showDocumentCreated = (publicUrl) => {
    showModal('document-created', 'Document Created Successfully!', '', null, publicUrl);
  };

  return {
    modal,
    showModal,
    closeModal,
    showSuccess,
    showError,
    showConfirm,
    showDocumentCreated
  };
};