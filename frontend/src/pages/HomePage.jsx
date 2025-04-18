// src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from 'react';

// MUI Imports
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress'; // For delete loading

// Child Components
import CreateFolderForm from '../components/CreateFolderForm';
import FolderList from '../components/FolderList';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

// API service functions
import { listFolders, deleteFolder } from '../services/api';

function HomePage() {
  // Folders list state
  const [folders, setFolders] = useState([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [errorFolders, setErrorFolders] = useState('');

  // Folder Deletion State
  const [folderToDelete, setFolderToDelete] = useState(null); // Stores {id, name, is_protected}
  const [openFolderDeleteDialog, setOpenFolderDeleteDialog] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [folderDeleteError, setFolderDeleteError] = useState(''); // General delete error
  const [deletePassword, setDeletePassword] = useState(''); // Password input for dialog
  const [deletePasswordError, setDeletePasswordError] = useState(''); // Password specific error for dialog

  // --- Fetch Logic ---
  const fetchFoldersCallback = useCallback(async () => {
    console.log("HomePage: Fetching folders...");
    setIsLoadingFolders(true); setErrorFolders('');
    try { const data = await listFolders(); setFolders(data || []); }
    catch (err) { console.error("HomePage: Fetch Error:", err); setErrorFolders(err.message); setFolders([]); }
    finally { setIsLoadingFolders(false); }
  }, []);
  useEffect(() => { fetchFoldersCallback(); }, [fetchFoldersCallback]);

  // --- Create Folder Callback ---
  const handleFolderCreated = () => { fetchFoldersCallback(); };

  // --- Folder Delete Handlers ---
  // Called by FolderList when delete icon is clicked
  const handleDeleteFolderRequest = (folder) => {
    console.log("Homepage: Delete requested for folder:", folder);
    setFolderToDelete(folder); // Store folder info (including is_protected)
    setFolderDeleteError(''); // Clear previous errors
    setDeletePasswordError('');
    setDeletePassword('');
    setOpenFolderDeleteDialog(true); // Open dialog
  };

  // Closes the dialog
  const handleCloseFolderDeleteDialog = () => {
    if (isDeletingFolder) return; // Prevent closing while processing
    setOpenFolderDeleteDialog(false);
    setFolderToDelete(null);
    setDeletePassword('');
    setDeletePasswordError('');
  };

  // Called when 'Delete' button inside dialog is clicked
  const handleConfirmFolderDelete = async () => {
    if (!folderToDelete) return;

    // Frontend check if password required but empty
    if (folderToDelete.is_protected && !deletePassword) {
        setDeletePasswordError("Password is required to delete this folder.");
        return;
    }

    setIsDeletingFolder(true);
    setFolderDeleteError(''); // Clear general error display
    setDeletePasswordError(''); // Clear password error display

    try {
      // Call API, passing password only if folder is protected
      await deleteFolder(folderToDelete.id, folderToDelete.is_protected ? deletePassword : undefined);

      console.log(`HomePage: Folder ${folderToDelete.id} deletion successful.`);
      // Close dialog and clear state on success
      handleCloseFolderDeleteDialog(); // Use the closing handler
      fetchFoldersCallback(); // Refresh the folder list
      // Optionally show a success Snackbar message here
    } catch (err) {
      console.error("Folder deletion API call failed:", err);
      const errorMsg = err.response?.data?.error || err.message || 'Could not delete folder.';
      // Check if it was a password error (403) or other error
      if (err.response?.status === 403) {
           setDeletePasswordError(errorMsg); // Show error specific to password field
      } else {
           setFolderDeleteError(errorMsg); // Show general error (maybe outside dialog, or inside)
           // Close dialog on general errors? Or keep open? Let's keep open for now.
      }
    } finally {
      setIsDeletingFolder(false); // Stop loading indicator
      // Do not automatically close dialog on error, let user see message
    }
  };
  // --- End Folder Delete Handlers ---

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Create Folder Form Column */}
        <Grid item xs={12} md={6}>
          <CreateFolderForm onFolderCreatedSuccess={handleFolderCreated} />
        </Grid>

        {/* Folder List Column */}
        <Grid item xs={12} md={6}>
           {/* Folder Loading Error */}
           {errorFolders && !isLoadingFolders && ( <Alert severity="error" sx={{ mb: 2 }}>{`Error loading folders: ${errorFolders}`}</Alert> )}
           {/* Display general delete error (if dialog closed on error) - optional */}
           {/* {!isDeletingFolder && folderDeleteError && !openFolderDeleteDialog && ( <Alert severity="error" sx={{ mb: 2 }}>{`Delete Error: ${folderDeleteError}`}</Alert> )} */}
           {/* Show subtle loading bar when deleting */}
           {isDeletingFolder && <LinearProgress color="error" sx={{mb: 1}} />}

          <FolderList
            folders={folders}
            isLoading={isLoadingFolders || isDeletingFolder} // Indicate loading during delete too
            onRefresh={fetchFoldersCallback}
            onDeleteFolderRequest={handleDeleteFolderRequest} // Pass request handler
          />
        </Grid>
      </Grid>

      {/* Render Delete Confirmation Dialog for Folders */}
      {/* Ensure folderToDelete is not null before rendering */}
      {folderToDelete && (
          <DeleteConfirmDialog
             open={openFolderDeleteDialog}
             onClose={handleCloseFolderDeleteDialog}
             onConfirm={handleConfirmFolderDelete}
             dialogTitle="Confirm Folder Deletion"
             dialogText={`Are you sure you want to delete the folder "${folderToDelete.name}" and ALL its contents? This cannot be undone.`}
             isDeleting={isDeletingFolder}
             // Pass password state only if folder is protected
             requiresPassword={!!folderToDelete.is_protected} // Pass boolean
             password={deletePassword}
             onPasswordChange={(e) => {
                 setDeletePassword(e.target.value);
                 // Clear password error when user starts typing again
                 if (deletePasswordError) setDeletePasswordError('');
             }}
             passwordError={deletePasswordError} // Specific error for password field
             deleteError={folderDeleteError} // General error from API call
          />
       )}

    </Box>
  );
}

export default HomePage;