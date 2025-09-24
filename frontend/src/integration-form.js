import { useState } from 'react';
import {
    Box,
    Autocomplete,
    TextField,
    Paper,
    Typography,
    Stack,
    Divider
} from '@mui/material';
import { AirtableIntegration } from './integrations/airtable';
import { NotionIntegration } from './integrations/notion';
import { HubSpotIntegration } from './integrations/hubspot'; // Import HubSpot
import { DataForm } from './data-form';

const integrationMapping = {
    'Airtable': AirtableIntegration,
    'Notion': NotionIntegration,
    'HubSpot': HubSpotIntegration, // Add HubSpot to the mapping
};

export const IntegrationForm = () => {
    const [integrationParams, setIntegrationParams] = useState({});
    const [user, setUser] = useState('TestUser');
    const [org, setOrg] = useState('TestOrg');
    const [currType, setCurrType] = useState(null);
    const CurrIntegration = integrationMapping[currType];

    const handleIntegrationChange = (event, value) => {
        setCurrType(value);
        // Reset credentials when changing integration type
        setIntegrationParams({}); 
    };

    return (
        <Box display='flex' justifyContent='center' alignItems='center' sx={{ width: '100%', minHeight: '100vh', p: 3 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2, width: '100%', maxWidth: 500, bgcolor: 'background.paper' }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                    Integration Hub
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
                    Connect your apps and load your data seamlessly.
                </Typography>
                
                <Stack spacing={3}>
                    <TextField
                        label="User"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        variant="outlined"
                    />
                    <TextField
                        label="Organization"
                        value={org}
                        onChange={(e) => setOrg(e.target.value)}
                        variant="outlined"
                    />
                    <Autocomplete
                        id="integration-type"
                        options={Object.keys(integrationMapping)}
                        renderInput={(params) => <TextField {...params} label="Integration Type" />}
                        onChange={handleIntegrationChange}
                        value={currType}
                    />
                </Stack>
                
                {currType &&
                    <Box mt={3}>
                         <Divider sx={{ my: 2 }}>
                            <Typography variant="overline">Connection</Typography>
                        </Divider>
                        <CurrIntegration user={user} org={org} integrationParams={integrationParams} setIntegrationParams={setIntegrationParams} />
                    </Box>
                }
                
                {integrationParams?.credentials &&
                    <Box mt={2}>
                        <Divider sx={{ my: 2 }}>
                            <Typography variant="overline">Data Loader</Typography>
                        </Divider>
                        <DataForm integrationType={integrationParams?.type} credentials={integrationParams?.credentials} />
                    </Box>
                }
            </Paper>
        </Box>
    );
}