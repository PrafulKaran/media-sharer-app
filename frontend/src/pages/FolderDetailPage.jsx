// src/pages/FolderDetailPage.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import Button from '@mui/material/Button';
// Delete/Dialog imports needed for DeleteConfirmDialog
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';


// Child Components
import FileListDisplay from '../components/FileListDisplay';
import FileUpload from '../components/FileUpload'; // Renders FAB and handles upload state
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import FileViewerLightbox from '../components/FileViewerLightbox';

// API service functions
import {
    getFolderDetails,
    listFiles,
    deleteFile,
    getFileSignedUrl,
    verifyFolderPassword
} from '../services/api';

// Helper function to format file size (keep here or move to utils)
const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024; if (typeof bytes !== 'number') bytes = Number(bytes);
    if (isNaN(bytes) || bytes <= 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeInUnit = bytes / Math.pow(k, i);
    return parseFloat(sizeInUnit.toFixed(2)) + ' ' + sizes[i];
};


function FolderDetailPage() {
    const { folderId } = useParams();

    // --- State Management ---
    const [folderDetails, setFolderDetails] = useState(null);
    const [isLoadingFolder, setIsLoadingFolder] = useState(true);
    const [errorFolder, setErrorFolder] = useState('');
    const [isPasswordProtected, setIsPasswordProtected] = useState(false);
    const [files, setFiles] = useState([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [errorFiles, setErrorFiles] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);
    const [enteredPassword, setEnteredPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [hasFolderAccess, setHasFolderAccess] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteStatus, setDeleteStatus] = useState(''); // Just error message
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [signedUrlsCache, setSignedUrlsCache] = useState({});
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);
    const [fileAccessError, setFileAccessError] = useState('');
    // --- REMOVE ---
    // const fileInputRef = useRef(null); // No longer needed here
    // --- END REMOVE ---

    // --- Data Fetching Callbacks ---
    const fetchFolderData = useCallback(async () => {
        if (!folderId) return;
        setIsLoadingFolder(true); setErrorFolder(''); setFolderDetails(null);
        setIsPasswordProtected(false); setNeedsVerification(false); setHasFolderAccess(false);
        setErrorFiles(''); setFiles([]); setIsLoadingFiles(false);
        try {
            const data = await getFolderDetails(folderId);
            setFolderDetails(data);
            if (data?.is_protected) { setIsPasswordProtected(true); setNeedsVerification(true); }
            else { setIsPasswordProtected(false); setNeedsVerification(false); setHasFolderAccess(true); fetchFilesList(); }
        } catch (err) { setErrorFolder(err.response?.data?.error || err.message || 'Failed folder fetch'); }
        finally { setIsLoadingFolder(false); }
    }, [folderId]); // fetchFilesList removed

    const fetchFilesList = useCallback(async () => { // Removed password param
        if (!folderId || (!hasFolderAccess && isPasswordProtected)) {
             console.log("Skipping file fetch: Access not granted yet.");
             if (!hasFolderAccess && isPasswordProtected) setIsLoadingFiles(false);
             return;
         }
        setIsLoadingFiles(true); setErrorFiles(''); setFiles([]);
        try {
            const data = await listFiles(folderId); // No password needed in call
            setFiles(data || []);
            if (!hasFolderAccess && isPasswordProtected) setHasFolderAccess(true); // Grant access if fetch succeeded after prompt
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed fetch';
            if (err.response?.status === 401) {
                 setErrorFiles("Session expired or invalid. Please re-enter password.");
                 setHasFolderAccess(false); setNeedsVerification(true); setSignedUrlsCache({});
            } else { setErrorFiles(errorMsg); }
        } finally { setIsLoadingFiles(false); }
    }, [folderId, hasFolderAccess, isPasswordProtected]);

    useEffect(() => { fetchFolderData(); }, [fetchFolderData]);


    // --- Event Handlers ---
    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        if (!enteredPassword) { setPasswordError("Password required."); return; }
        setIsVerifyingPassword(true); setPasswordError(''); setErrorFiles('');
        try { await verifyFolderPassword(folderId, enteredPassword);
            setHasFolderAccess(true); setNeedsVerification(false); setEnteredPassword('');
            fetchFilesList(); // Fetch files now
        } catch (err) { setPasswordError(err.response?.data?.error || "Verification failed"); setHasFolderAccess(false); }
        finally { setIsVerifyingPassword(false); }
    };

    // Upload success callback - just refresh list
    const handleUploadSuccess = () => { fetchFilesList(); };

    // --- REMOVE ---
    // No longer needed in this component
    // const handleFileUploadRequest = () => { ... };
    // const handleFileSelectedForUpload = (event) => { ... };
    // --- END REMOVE ---

    // Delete handlers
    const handleDeleteFileRequest = (file) => {
         if (!hasFolderAccess && isPasswordProtected) { alert("Enter password to delete."); return; }
        setFileToDelete(file); setDeleteStatus(''); setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => { if(isDeleting) return; setOpenDeleteDialog(false); setFileToDelete(null); };
    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;
        setIsDeleting(true); setDeleteStatus('');
        try { await deleteFile(fileToDelete.id); fetchFilesList(); }
        catch (err) { setDeleteStatus(err.response?.data?.error || 'Delete failed.'); }
        finally { setIsDeleting(false); /* Keep dialog open on error */ if (!deleteStatus) { setOpenDeleteDialog(false); setFileToDelete(null); } }
    };

    // View/Lightbox handlers
    const handleViewFileRequest = async (file, index) => {
         if (!hasFolderAccess && isPasswordProtected) { alert("Enter password to view."); return; }
        setIsFetchingUrl(true); setFileAccessError(''); let signedUrl = signedUrlsCache[file.id];
        if (!signedUrl) { try { signedUrl = await getFileSignedUrl(file.id); setSignedUrlsCache(prev => ({ ...prev, [file.id]: signedUrl })); } catch (err) { setFileAccessError(`URL fetch failed: ${err.message}`); setIsFetchingUrl(false); return; } }
        setIsFetchingUrl(false); setLightboxIndex(index); setLightboxOpen(true);
    };
    const handleLightboxClose = () => { setLightboxOpen(false); };


    // --- Prepare Slides for Lightbox ---
    const slides = files.map(file => {
        const url = signedUrlsCache[file.id];
        const slide = { src: url || '', title: file.name, description: `Size: ${formatFileSize(file.size)}`, download: url };
        if (file.mime_type?.startsWith('video/')) { slide.type = 'video'; slide.sources = [{ src: url || '', type: file.mime_type }]; }
        return slide;
    });


    // --- Render Page ---
    const isBusy = isDeleting || isFetchingUrl || isVerifyingPassword;

    return (
        <Box sx={{ position: 'relative', pb: 10 }}>
            {/* Back Button */}
            <IconButton component={RouterLink} to="/" aria-label="back to home" sx={{ mb: 2 }}><ArrowBackIcon /></IconButton>

            {/* Folder Title & Lock Icon */}
            <Typography variant="h5" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                {isLoadingFolder ? <CircularProgress size={20} sx={{ mr: 1 }} /> : (isPasswordProtected ? <LockIcon fontSize="inherit" sx={{ mr: 1, color: hasFolderAccess ? 'success.main' : 'warning.main' }} /> : <LockOpenIcon fontSize="inherit" sx={{ mr: 1, color: 'success.main' }} />)}
                Contents of: {folderDetails?.name || `Folder ${folderId}`}
            </Typography>
            {errorFolder && !isLoadingFolder && (<Alert severity="error" sx={{ my: 2 }}>{errorFolder}</Alert>)}

            {/* Password Prompt Section */}
            {needsVerification && !hasFolderAccess && !isLoadingFolder && (
                 <Box component="form" onSubmit={handlePasswordSubmit} sx={{ my: 2, p: 2, border: '1px solid', borderColor: 'warning.light', borderRadius: 1 }}>
                     {/* ... Password Input and Button ... */}
                     <Typography variant="body1" gutterBottom>Enter password to access this folder:</Typography>
                     <TextField margin="normal" required fullWidth name="folderPasswordPrompt" label="Folder Password" type="password" id="folderPasswordPrompt"
                        value={enteredPassword} onChange={(e) => setEnteredPassword(e.target.value)}
                        error={!!passwordError} helperText={passwordError} disabled={isVerifyingPassword}
                     />
                      <Button type="submit" fullWidth variant="contained" sx={{ mt: 1, mb: 1 }} disabled={isVerifyingPassword}>
                         {isVerifyingPassword ? <CircularProgress size={24}/> : "Unlock Folder"}
                      </Button>
                 </Box>
            )}

            {/* FileUpload Component - Renders FAB, Input, Status */}
            <FileUpload
                 folderId={folderId}
                 onUploadSuccess={handleUploadSuccess}
                 // Disable FAB based on parent page state
                 disabled={isBusy || !hasFolderAccess}
            />

            {/* Display Delete Error */}
            {!isDeleting && deleteStatus && (<Alert severity="error" sx={{ mb: 2 }}>{`Delete Error: ${deleteStatus}`}</Alert>)}
            {isDeleting && <LinearProgress sx={{mb: 2}} color="error"/> }
            {/* Display File Access Error & Loading */}
            {fileAccessError && <Alert severity="error" sx={{ mb: 2 }}>{fileAccessError}</Alert>}
            {isFetchingUrl && <LinearProgress sx={{ mb: 2 }} color="info"/>}


            {/* Divider shown only if content area should be visible */}
            {hasFolderAccess && <Divider sx={{ my: 2 }} />}

            {/* --- File List Section --- */}
            {hasFolderAccess && (
                <FileListDisplay
                    files={files}
                    isLoading={isLoadingFiles}
                    error={errorFiles}
                    onViewFile={handleViewFileRequest}
                    onDeleteFile={handleDeleteFileRequest}
                    itemDisabled={isBusy}
                />
            )}
            {needsVerification && !hasFolderAccess && !isLoadingFolder && (
                 <Typography sx={{ color: 'text.secondary', textAlign: 'center', my: 3 }}>
                     Enter password to view or manage files.
                 </Typography>
             )}
             {/* --- End File List Section --- */}


            {/* --- REMOVE Redundant Input --- */}
            {/* <input type="file" ref={fileInputRef} onChange={handleFileSelectedForUpload} style={{ display: 'none' }} /> */}
            {/* --- END REMOVE --- */}


            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                fileName={fileToDelete?.name}
                isDeleting={isDeleting}
                deleteError={deleteStatus}
            />

            {/* Lightbox */}
             <FileViewerLightbox
                open={lightboxOpen}
                index={lightboxIndex}
                slides={slides}
                onClose={handleLightboxClose}
            />
        </Box>
    );
}

export default FolderDetailPage;