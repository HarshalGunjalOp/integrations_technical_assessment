import { IntegrationForm } from './integration-form';
import { NotificationProvider } from './notifications/NotificationContext';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// Optional: Define a theme for a consistent look
const theme = createTheme({
  palette: {
    background: {
      default: '#f4f6f8'
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <IntegrationForm />
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;