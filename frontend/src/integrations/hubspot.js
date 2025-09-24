import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useNotifier } from '../notifications/NotificationContext';

export const HubSpotIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const { notify } = useNotifier();

    const handleConnectClick = async () => {
        try {
            setIsConnecting(true);
            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);
            const response = await axios.post(`http://localhost:8000/integrations/hubspot/authorize`, formData);
            const authURL = response?.data;

            const newWindow = window.open(authURL, 'HubSpot Authorization', 'width=800,height=600');

            const pollTimer = window.setInterval(() => {
                if (newWindow?.closed) {
                    window.clearInterval(pollTimer);
                    handleWindowClosed();
                }
            }, 500);
        } catch (e) {
            setIsConnecting(false);
            notify(e?.response?.data?.detail || 'An error occurred during authorization.', 'error');
        }
    };

    const handleWindowClosed = async () => {
        try {
            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);
            const response = await axios.post(`http://localhost:8000/integrations/hubspot/credentials`, formData);
            const credentials = response.data;
            if (credentials) {
                notify('HubSpot connected successfully!', 'success');
                setIsConnected(true);
                setIntegrationParams(prev => ({ ...prev, credentials, type: 'HubSpot' }));
            }
        } catch (e) {
            notify(e?.response?.data?.detail || 'Failed to retrieve HubSpot credentials.', 'error');
        } finally {
            setIsConnecting(false);
        }
    };

    useEffect(() => {
        if (integrationParams?.type === 'HubSpot' && integrationParams?.credentials) {
            setIsConnected(true);
        } else {
            setIsConnected(false);
        }
    }, [integrationParams]);


    return (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
                variant='contained'
                onClick={isConnected ? () => { } : handleConnectClick}
                color={isConnected ? 'success' : 'primary'}
                disabled={isConnecting}
                sx={{
                    minWidth: 220,
                    pointerEvents: isConnected ? 'none' : 'auto',
                    cursor: isConnected ? 'default' : 'pointer',
                }}
            >
                {isConnecting 
                    ? <CircularProgress size={24} color="inherit" /> 
                    : isConnected 
                    ? 'HubSpot Connected' 
                    : 'Connect to HubSpot'
                }
            </Button>
        </Box>
    );
};