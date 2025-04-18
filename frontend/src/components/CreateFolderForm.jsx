// frontend/src/components/CreateFolderForm.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes
import { createFolder } from '../services/api';

// MUI Imports
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Define prop types
CreateFolderForm.propTypes = {
  onFolderCreatedSuccess: PropTypes.func.isRequired, // Expects the callback function
};


function CreateFolderForm({ onFolderCreatedSuccess }) { // Destructure the prop
  // State specific to this form
  const [folderName, setFolderName] = useState('');
  const [folderPassword, setFolderPassword] = useState('');
  const [status, setStatus] = useState({ message: '', severity: '' });
  const [isLoading, setIsLoading] = useState(false);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setStatus({ message: 'Error: Folder name cannot be empty.', severity: 'error' });
      return;
    }

    setIsLoading(true);
    setStatus({ message: 'Creating folder...', severity: 'info' });
    const payload = { name: folderName.trim() };
    if (folderPassword) {
      payload.password = folderPassword;
    }

    try {
      const newFolderData = await createFolder(payload);
      console.log('Folder created:', newFolderData);
      setStatus({ message: `Success: Folder '${newFolderData.name}' created (ID: ${newFolderData.id})`, severity: 'success' });
      setFolderName(''); // Clear fields on success
      setFolderPassword('');

      // --- CALL THE CALLBACK PROP ON SUCCESS ---
      onFolderCreatedSuccess(); // Notify HomePage to refresh
      // --- END CALLBACK CALL ---

    } catch (error) {
       console.error('Error creating folder:', error);
       let errorMessage = 'An unknown error occurred.';
       // Extract error message from backend response if available
       if (error.response?.data?.error) {
           errorMessage = `${error.response.data.error} (Status: ${error.response.status})`;
       } else if (error.request) { // Network error
           errorMessage = 'No response received from server.';
       } else { // Other setup errors
           errorMessage = error.message;
       }
       setStatus({ message: `Error: ${errorMessage}`, severity: 'error' });
    } finally {
        setIsLoading(false); // Ensure loading stops
    }
  };

  // --- JSX for the form ---
  return (
    <Box sx={{ my: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, backgroundColor: 'grey.50' }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Create New Folder
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="folderName"
          label="Folder Name"
          name="folderName"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <TextField
          margin="normal"
          fullWidth
          id="folderPassword"
          label="Password (Optional)"
          name="folderPassword"
          type="password"
          value={folderPassword}
          onChange={(e) => setFolderPassword(e.target.value)}
          disabled={isLoading}
        />
        <Box sx={{ mt: 2, position: 'relative' }}> {/* Wrapper for button/spinner */}
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            fullWidth
            sx={{ py: 1.5 }} // Button padding
          >
            {isLoading ? 'Creating...' : 'Create Folder'}
          </Button>
          {/* Centered spinner */}
          {isLoading && (
            <CircularProgress
              size={24}
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-12px',
                marginLeft: '-12px',
              }}
            />
          )}
        </Box>
      </Box>
      {/* Status Alert */}
      {status.message && (
          <Alert severity={status.severity || 'info'} sx={{ mt: 2 }}>
              {status.message}
          </Alert>
      )}
    </Box>
  );
}

export default CreateFolderForm;