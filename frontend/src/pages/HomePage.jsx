// src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

// Child Components
import CreateFolderForm from '../components/CreateFolderForm';
import FolderList from '../components/FolderList';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

// API service functions
import { listFolders, deleteFolder } from '../services/api';

function HomePage() {
  // State for folders list
  const [folders, setFolders] = useState([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [errorFolders, setErrorFolders] = useState(''); // For list loading errors

  // State for Folder Deletion
  const [folderToDelete, setFolderToDelete] = useState(null); // Stores {id, name, is_protected}
  const [openFolderDeleteDialog, setOpenFolderDeleteDialog] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  // const [folderDeleteError, setFolderDeleteError] = useState(''); // Replaced by Snackbar
  const [deletePassword, setDeletePassword] = useState(''); // Password input for dialog
  const [deletePasswordError, setDeletePasswordError] = useState(''); // Password specific error for dialog

  // --- Snackbar State ---
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // --- Fetch Logic ---
  // useCallback ensures the function identity remains stable unless dependencies change
  const fetchFoldersCallback = useCallback(async () => {
    console.log("HomePage: Fetching folders...");
    setIsLoadingFolders(true);
    setErrorFolders(''); // Clear previous errors before fetching
    try {
      const data = await listFolders(); // Call the API
      console.log("HomePage: API returned folders:", data);
      setFolders(data || []); // Update state, ensuring it's always an array
      console.log("HomePage: Folders state updated.");
    } catch (err) {
      console.error("HomePage: Error fetching folders:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch folders';
      setErrorFolders(errorMsg); // Set error state for display
      setFolders([]); // Clear folders on error
    } finally {
      console.log("HomePage: fetchFoldersCallback finally block.");
      setIsLoadingFolders(false); // Ensure loading state is turned off
    }
  }, []); // Empty dependency array means this callback is stable

  // Fetch folders when the component mounts for the first time
  useEffect(() => {
    console.log("HomePage: Mounting, calling fetchFoldersCallback.");
    fetchFoldersCallback();
  }, [fetchFoldersCallback]); // Depend only on the stable callback

  // --- Create Folder Callback ---
  // Called by CreateFolderForm upon successful folder creation
  const handleFolderCreated = () => {
    console.log("HomePage: handleFolderCreated called, calling fetchFoldersCallback.");
    // Optionally show a snackbar for creation success
    setSnackbar({ open: true, message: 'Folder created successfully!', severity: 'success' });
    fetchFoldersCallback(); // Refresh the list
  };

  // --- Folder Delete Handlers ---
  // Called by FolderList when a delete icon is clicked
  const handleDeleteFolderRequest = (folder) => {
    console.log("Homepage: Delete requested for folder:", folder);
    setFolderToDelete(folder); // Store which folder to delete
    // setFolderDeleteError(''); // Not needed, using snackbar for final status
    setDeletePasswordError(''); // Clear password error from previous attempts
    setDeletePassword(''); // Clear password input
    setSnackbar(prev => ({ ...prev, open: false })); // Close any previous snackbar
    setOpenFolderDeleteDialog(true); // Open the confirmation dialog
  };

  // Closes the delete confirmation dialog
  const handleCloseFolderDeleteDialog = () => {
    if (isDeletingFolder) return; // Don't close if delete is in progress
    setOpenFolderDeleteDialog(false);
    setFolderToDelete(null); // Clear target folder
    setDeletePassword(''); // Clear password input
    setDeletePasswordError(''); // Clear password error
  };

  // Called when the user confirms deletion in the dialog
  const handleConfirmFolderDelete = async () => {
    if (!folderToDelete) return;

    // Front-end check if password is required but empty
    if (folderToDelete.is_protected && !deletePassword) {
        setDeletePasswordError("Password is required to delete this protected folder.");
        return; // Stop deletion process
    }

    setIsDeletingFolder(true); // Set loading state for delete
    // setFolderDeleteError(''); // General error state removed for snackbar
    setDeletePasswordError(''); // Clear password error before API call

    try {
      // Call API, passing password only if the folder is protected
      await deleteFolder(folderToDelete.id, folderToDelete.is_protected ? deletePassword : undefined);

      console.log(`HomePage: Folder ${folderToDelete.id} deletion successful.`);
      handleCloseFolderDeleteDialog(); // Close dialog and clear related state
      setSnackbar({ open: true, message: `Folder "${folderToDelete.name}" deleted.`, severity: 'success' }); // Show success snackbar
      fetchFoldersCallback(); // Refresh the folder list

    } catch (err) {
      console.error("Folder deletion API call failed:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Could not delete folder.';
      // Check if it was a password error (403 Forbidden)
      if (err.response?.status === 403) {
           setDeletePasswordError(errorMsg); // Show error specific to the password field in the dialog
           setDeletePassword(''); // Optionally clear the password field on error
      } else {
           // For other errors, show a general error snackbar and close the dialog
           setSnackbar({ open: true, message: `Delete Error: ${errorMsg}`, severity: 'error' });
           handleCloseFolderDeleteDialog(); // Close dialog on general error
      }
    } finally {
      setIsDeletingFolder(false); // Ensure loading indicator stops
      // Dialog remains open only if there was a password error
    }
  };
  // --- End Folder Delete Handlers ---

   // --- Snackbar Close Handler ---
   const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') { return; } // Ignore clicks away
    setSnackbar(prev => ({ ...prev, open: false })); // Close snackbar
  };

  // Log state before rendering for debugging
  console.log("HomePage: Rendering with folders state:", folders);

  return (
    <Box>
      {/* Grid Layout for responsiveness */}
      <Grid container spacing={3}>
        {/* Create Folder Form Column */}
        <Grid item xs={12} md={6}>
          <CreateFolderForm onFolderCreatedSuccess={handleFolderCreated} />
        </Grid>

        {/* Folder List Column */}
        <Grid item xs={12} md={6}>
           {/* Display folder list loading error (if any) */}
           {errorFolders && !isLoadingFolders && (
             <Alert severity="error" sx={{ mb: 2 }}>{`Error loading folders: ${errorFolders}`}</Alert>
           )}
           {/* Display subtle loading bar when deleting */}
           {isDeletingFolder && <LinearProgress color="error" sx={{mb: 1, height: '2px'}} />}

          {/* Folder List Component */}
          <FolderList
            folders={folders}
            // Indicate loading if initially fetching OR if deleting a folder
            isLoading={isLoadingFolders || isDeletingFolder}
            onRefresh={fetchFoldersCallback} // Pass fetch callback for refresh button
            onDeleteFolderRequest={handleDeleteFolderRequest} // Pass delete request handler
          />
        </Grid>
      </Grid> {/* End Grid container */}

      {/* Render Delete Confirmation Dialog for Folders */}
      {/* Ensure folderToDelete has data before rendering dialog */}
      {folderToDelete && (
          <DeleteConfirmDialog
             open={openFolderDeleteDialog}
             onClose={handleCloseFolderDeleteDialog}
             onConfirm={handleConfirmFolderDelete}
             // Pass dynamic text based on folder name
             dialogTitle="Confirm Folder Deletion"
             dialogText={`Are you sure you want to delete the folder "${folderToDelete.name}" and ALL its contents? This cannot be undone.`}
             isDeleting={isDeletingFolder}
             // Pass password state only if folder is protected
             requiresPassword={!!folderToDelete.is_protected} // Pass boolean flag
             password={deletePassword}
             onPasswordChange={(e) => {
                 setDeletePassword(e.target.value);
                 // Clear password error when user starts typing again
                 if (deletePasswordError) setDeletePasswordError('');
             }}
             passwordError={deletePasswordError} // Specific error for password field in dialog
             // deleteError prop removed, general errors use Snackbar now
          />
       )}

        {/* Snackbar for General Notifications */}
        <Snackbar
            open={snackbar.open}
            autoHideDuration={4000} // Hide after 4 seconds
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} // Position
         >
             {/* Embed Alert inside Snackbar for severity styling and close button */}
             <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || 'info'} sx={{ width: '100%' }} variant="filled">
                 {snackbar.message}
             </Alert>
         </Snackbar>
    </Box>
  );
}

export default HomePage;