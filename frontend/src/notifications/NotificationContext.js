import React, { createContext, useState, useCallback, useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

export const useNotifier = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

    const notify = useCallback((message, severity = 'info') => {
        setNotification({ open: true, message, severity });
    }, []);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setNotification(prev => ({ ...prev, open: false }));
    };

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}
            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleClose} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
};