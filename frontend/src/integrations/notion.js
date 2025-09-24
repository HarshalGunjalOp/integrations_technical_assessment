import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress
} from '@mui/material';
import axios from 'axios';
import { useNotifier } from '../notifications/NotificationContext'; 

export const NotionIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const { notify } = useNotifier(); // 2. Get the notify function from the context

    // Function to open OAuth in a new window
    const handleConnectClick = async () => {
        try {
            setIsConnecting(true); [cite_start]
            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);
            const response = await axios.post(`http://localhost:8000/integrations/notion/authorize`, formData);
            const authURL = response?.data;

            const newWindow = window.open(authURL, 'Notion Authorization', 'width=600, height=600');

            // Polling for the window to close
            const pollTimer = window.setInterval(() => {
                if (newWindow?.closed !== false) {
                    window.clearInterval(pollTimer);
                    handleWindowClosed();
                }
            }, 200); 
        } catch (e) {
            setIsConnecting(false);
            notify(e?.response?.data?.detail || 'An error occurred during authorization.', 'error');
        }
    }

    // Function to handle logic when the OAuth window closes
    const handleWindowClosed = async () => {
        try {
            const formData = new FormData(); 
            formData.append('user_id', user);
            formData.append('org_id', org);
            const response = await axios.post(`http://localhost:8000/integrations/notion/credentials`, formData);
            const credentials = response.data;
            if (credentials) {
                // 4. Add a success notification
                notify('Notion connected successfully!', 'success');
                setIsConnecting(false);
                setIsConnected(true);
                setIntegrationParams(prev => ({ ...prev, credentials: credentials, type: 'Notion' }));
            }
        } catch (e) {
            setIsConnecting(false);
            notify(e?.response?.data?.detail || 'Failed to retrieve Notion credentials.', 'error');
        }
    }

    useEffect(() => {
        if (integrationParams?.type === 'Notion' && integrationParams?.credentials) {
            setIsConnected(true);
        } else {
            setIsConnected(false);
        }
    }, [integrationParams]);


    return (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
                variant='contained'
                onClick={isConnected ? () => {} : handleConnectClick}
                color={isConnected ? 'success' : 'primary'}
                disabled={isConnecting}
                 sx={{
                    minWidth: 220,
                    pointerEvents: isConnected ? 'none' : 'auto', 
                    cursor: isConnected ? 'default' : 'pointer',
                    opacity: isConnected ? 1 : undefined,
                }}
            >
                {isConnecting 
                    ? <CircularProgress size={24} color="inherit" /> 
                    : isConnected 
                    ? 'Notion Connected'
                    : 'Connect to Notion'}
            </Button>
        </Box>
    );
}