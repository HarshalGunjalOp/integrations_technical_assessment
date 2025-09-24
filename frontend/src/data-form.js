import { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Stack
} from '@mui/material';
import axios from 'axios';
import { useNotifier } from './notifications/NotificationContext';


const endpointMapping = {
    'Notion': 'notion',
    'Airtable': 'airtable',
    'HubSpot': 'hubspot', // Add HubSpot
};

export const DataForm = ({ integrationType, credentials }) => {
    const [loadedData, setLoadedData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { notify } = useNotifier();
    const endpoint = endpointMapping[integrationType];

    const handleLoad = async () => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('credentials', JSON.stringify(credentials));
            const response = await axios.post(`http://localhost:8000/integrations/${endpoint}/load`, formData);
            setLoadedData(response.data);
            notify('Data loaded successfully!', 'success');
        } catch (e) {
            notify(e?.response?.data?.detail || 'Failed to load data.', 'error');
            setLoadedData(null);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Box display='flex' justifyContent='center' alignItems='center' flexDirection='column' width='100%'>
            <TextField
                label="Loaded Data"
                value={loadedData ? JSON.stringify(loadedData, null, 2) : '// Click "Load Data" to fetch items'}
                sx={{ mt: 2, width: '100%' }}
                InputLabelProps={{ shrink: true }}
                multiline
                rows={10}
                disabled
                variant="outlined"
                InputProps={{
                    style: {
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        backgroundColor: '#f5f5f5'
                    }
                }}
            />
            <Stack direction="row" spacing={2} sx={{ mt: 2, width: '100%' }}>
                <Button
                    onClick={handleLoad}
                    variant='contained'
                    disabled={isLoading}
                    sx={{ flexGrow: 1 }}
                >
                    {isLoading ? 'Loading...' : 'Load Data'}
                </Button>
                <Button
                    onClick={() => setLoadedData(null)}
                    variant='outlined'
                    color="secondary"
                    sx={{ flexGrow: 1 }}
                >
                    Clear Data
                </Button>
            </Stack>
        </Box>
    );
}