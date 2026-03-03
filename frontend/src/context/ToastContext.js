import React, { createContext, useState, useCallback } from 'react';

export const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toastRef, setToastRef] = useState(null);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    if (toastRef) {
      toastRef.show({
        type: type,
        text: message,
        duration: duration,
        placement: 'top',
      });
      return true;
    } else {
      console.warn('Toast ref not available yet');
      return false;
    }
  }, [toastRef]);

  const value = {
    toastRef,
    setToastRef,
    showToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    console.warn('useToastContext must be used within ToastProvider');
    return {
      toastRef: null,
      setToastRef: () => {},
      showToast: () => false,
    };
  }
  return context;
};
