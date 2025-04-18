// frontend/src/components/ConnectionTests.jsx
import React, { useState } from 'react';
import { pingBackend, testDbConnection } from '../services/api';

// Import MUI components
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress'; // Spinner for loading
import Stack from '@mui/material/Stack'; // For layout
import Divider from '@mui/material/Divider'; // Separator
import Chip from '@mui/material/Chip'; // Display status nicely

// Helper function for status chip color
const getStatusColor = (status) => {
  if (status === 'Connected!' || status === 'Success') return 'success';
  if (status.startsWith('Error')) return 'error';
  if (status === 'Testing...') return 'info';
  return 'default';
};

function ConnectionTests() {
  const [flaskStatus, setFlaskStatus] = useState('Not tested');
  const [dbStatus, setDbStatus] = useState({ status: 'Not tested', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleTestFlask = async () => {
    setIsLoading(true);
    setFlaskStatus('Testing...');
    setDbStatus({ status: 'Not tested', message: '' });
    try {
      const data = await pingBackend();
      if (data?.message === 'pong') setFlaskStatus('Connected!');
      else setFlaskStatus(`Unexpected: ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Error pinging Flask:', error);
      if (error.response) setFlaskStatus(`Error: Status ${error.response.status}`);
      else if (error.request) setFlaskStatus('Error: No response');
      else setFlaskStatus(`Error: ${error.message}`);
    } finally { setIsLoading(false); }
  };

  const handleTestDb = async () => {
    setIsLoading(true);
    setFlaskStatus('Not tested');
    setDbStatus({ status: 'Testing...', message: '' });
    try {
      const data = await testDbConnection();
      setDbStatus({ status: data.status, message: data.message });
    } catch (error) {
      console.error('Error testing DB:', error);
      if (error.response && error.response.data) {
        setDbStatus({ status: error.response.data.status || 'Error', message: error.response.data.message || `Server Error ${error.response.status}` });
      } else if (error.request) {
        setDbStatus({ status: 'Error', message: 'No response received' });
      } else {
        setDbStatus({ status: 'Error', message: `Request setup error: ${error.message}` });
      }
    } finally { setIsLoading(false); }
  };

  return (
    <Box sx={{ my: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Connection Tests
      </Typography>
      {/* Use Stack for vertical layout with spacing */}
      <Stack spacing={2} divider={<Divider orientation="horizontal" flexItem />}>
        <Box>
          <Button
            onClick={handleTestFlask}
            disabled={isLoading}
            variant="outlined" // Use outlined style for test buttons
            startIcon={isLoading && flaskStatus === 'Testing...' ? <CircularProgress size={20} /> : null} // Show spinner on button
          >
            1. Test React to Flask
          </Button>
          <Chip
              label={flaskStatus}
              color={getStatusColor(flaskStatus)}
              size="small"
              sx={{ ml: 2 }} // Add margin left
          />
        </Box>
        <Box>
          <Button
            onClick={handleTestDb}
            disabled={isLoading}
            variant="outlined"
            startIcon={isLoading && dbStatus.status === 'Testing...' ? <CircularProgress size={20} /> : null}
          >
            2. Test Flask to Supabase
          </Button>
           <Chip
              label={dbStatus.status}
              color={getStatusColor(dbStatus.status)}
              size="small"
              sx={{ ml: 2 }}
           />
           {dbStatus.message && dbStatus.status !== 'Testing...' && (
             <Typography variant="body2" sx={{mt: 1, color: getStatusColor(dbStatus.status) === 'error' ? 'error.main' : 'text.secondary'}}>
                Details: {dbStatus.message}
             </Typography>
            )}
        </Box>
      </Stack>
    </Box>
  );
}

export default ConnectionTests;