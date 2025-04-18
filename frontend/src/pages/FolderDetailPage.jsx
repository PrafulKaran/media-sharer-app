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
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import CloseIcon from '@mui/icons-material/Close';
import Stack from '@mui/material/Stack';
// File Icons
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import VideocamIcon from '@mui/icons-material/Videocam';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleIcon from '@mui/icons-material/Article';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import DescriptionIcon from '@mui/icons-material/Description';

// Child Components
import FileListDisplay from '../components/FileListDisplay';
import FileUpload from '../components/FileUpload';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import FileViewerLightbox from '../components/FileViewerLightbox';

// API service functions
import {
    getFolderDetails,
    listFiles,
    deleteFile,
    getFileSignedUrl,
    verifyFolderPassword,
    checkFolderAccess
} from '../services/api';

// Lightbox and Plugins
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Video from "yet-another-react-lightbox/plugins/video";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/plugins/captions.css";


// --- Helper Functions ---
const getFileIcon = (mimeType) => {
    if (!mimeType) return <InsertDriveFileIcon />;
    const type = mimeType.toLowerCase();
    if (type.startsWith('image/')) return <ImageIcon color="success" />;
    if (type.startsWith('audio/')) return <AudiotrackIcon color="secondary" />;
    if (type.startsWith('video/')) return <VideocamIcon color="info" />;
    if (type === 'application/pdf') return <PictureAsPdfIcon color="error" />;
    if (type.includes('wordprocessingml') || type.includes('msword')) return <ArticleIcon color="primary" />;
    if (type.includes('spreadsheetml') || type.includes('excel')) return <DescriptionIcon color="success"/>;
    if (type.includes('presentationml') || type.includes('powerpoint')) return <DescriptionIcon color="warning"/>;
    if (type.includes('zip')) return <FolderZipIcon color="action"/>;
    if (type.startsWith('text/')) return <ArticleIcon color="disabled"/>;
    return <InsertDriveFileIcon />;
};

const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024; if (typeof bytes !== 'number') bytes = Number(bytes);
    if (isNaN(bytes) || bytes <= 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeInUnit = bytes / Math.pow(k, i);
    return parseFloat(sizeInUnit.toFixed(2)) + ' ' + sizes[i];
};
// --- End Helper Functions ---


function FolderDetailPage() {
    const { folderId } = useParams();

    // --- State Management ---
    const [folderDetails, setFolderDetails] = useState(null);
    const [isLoadingFolder, setIsLoadingFolder] = useState(true);
    const [errorFolder, setErrorFolder] = useState('');
    // const [isPasswordProtected, setIsPasswordProtected] = useState(false); // Derived below
    const [files, setFiles] = useState([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [errorFiles, setErrorFiles] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);
    const [enteredPassword, setEnteredPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [passwordAttemptSucceeded, setPasswordAttemptSucceeded] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [signedUrlsCache, setSignedUrlsCache] = useState({});
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);
    const [fileAccessError, setFileAccessError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    // Derive protection status and access grant status from state
    const isProtected = folderDetails?.is_protected || false;
    const hasFolderAccess = !isLoadingFolder && (!isProtected || passwordAttemptSucceeded);

    // --- Data Fetching Callbacks ---
    const fetchFolderData = useCallback(async () => {
        if (!folderId) return;
        console.log("1. Fetching folder details...");
        setIsLoadingFolder(true); setErrorFolder(''); setFolderDetails(null);
        setNeedsVerification(false); setPasswordAttemptSucceeded(false); // Reset access state
        setErrorFiles(''); setFiles([]); setIsLoadingFiles(false); // Reset file state

        try {
            const data = await getFolderDetails(folderId);
            setFolderDetails(data);
            const protectedStatus = data?.is_protected || false;

            if (protectedStatus) {
                console.log("Folder is protected. Checking session access...");
                setNeedsVerification(true); // Assume verification needed initially
                try {
                    const accessResult = await checkFolderAccess(folderId);
                    if (accessResult.access) {
                        console.log("Session access check OK. Granting access.");
                        setPasswordAttemptSucceeded(true); // Mark access granted via session
                        setNeedsVerification(false); // Don't need prompt now
                        // Intentionally *don't* call fetchFilesList here, let the derived state trigger it if needed
                    } else {
                         console.log("Session access check failed. Password prompt needed.");
                         setPasswordAttemptSucceeded(false);
                         setNeedsVerification(true); // Ensure prompt shows
                    }
                } catch (accessError) {
                     console.error("Error during access check API call:", accessError);
                     setErrorFolder("Error checking folder access status."); // Show general error
                     setPasswordAttemptSucceeded(false);
                     setNeedsVerification(true); // Require password on error
                }
            } else {
                console.log("Folder not protected. Granting access.");
                setNeedsVerification(false);
                setPasswordAttemptSucceeded(true); // Access granted by default
                // Intentionally *don't* call fetchFilesList here, let the useEffect handle it based on passwordAttemptSucceeded changing
            }
        } catch (err) {
            console.error("Error fetching folder details:", err);
            setErrorFolder(err.response?.data?.error || err.message || 'Failed folder fetch');
        } finally {
            setIsLoadingFolder(false); // Done loading folder details
        }
    }, [folderId]);

    const fetchFilesList = useCallback(async () => {
        // Guard: Only fetch if folderId exists AND access is granted
        if (!folderId || !hasFolderAccess) {
             console.log("Skipping file fetch: Access not granted.");
             if (isLoadingFiles) setIsLoadingFiles(false);
             return;
         }
        console.log(`Fetching files for folder ID: ${folderId} (Access Granted)`);
        setIsLoadingFiles(true); setErrorFiles(''); setFiles([]);

        try {
            const data = await listFiles(folderId); // Backend checks session
            setFiles(data || []);
            setErrorFiles(''); // Clear file errors on successful fetch
        } catch (err) {
            console.error("Error fetching files:", err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed fetch';
            if (err.response?.status === 401) {
                 setErrorFiles("Session expired or invalid. Please re-enter password.");
                 setPasswordAttemptSucceeded(false); // Revoke access confirmation
                 setNeedsVerification(true); // Show prompt again
                 setSignedUrlsCache({});
                 setFiles([]); // Clear potentially stale file list
            } else { setErrorFiles(errorMsg); }
        } finally { setIsLoadingFiles(false); }
    }, [folderId, hasFolderAccess]); // Depends on folderId and access grant status

    // Initial data fetch effect
    useEffect(() => {
        fetchFolderData(); // Fetch folder details first on mount or ID change
    }, [fetchFolderData]);

    // Effect to fetch files *after* access has been granted (either initially or by password)
    useEffect(() => {
        if (hasFolderAccess) {
             fetchFilesList();
        }
         // Clear files if access is revoked (e.g., after session error in another action)
         else {
            setFiles([]);
         }
    }, [hasFolderAccess, fetchFilesList]); // Run when access status changes


    // --- Event Handlers ---

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        if (!enteredPassword) { setPasswordError("Password required."); return; }
        setIsVerifyingPassword(true); setPasswordError(''); setErrorFiles('');

        try {
            await verifyFolderPassword(folderId, enteredPassword);
            console.log("Password verified via API.");
            setPasswordAttemptSucceeded(true); // Mark verification successful
            setNeedsVerification(false); // Hide prompt
            setEnteredPassword('');
            // fetchFilesList() will be triggered by the useEffect watching hasFolderAccess
        } catch (err) {
            console.error("Password verification failed:", err);
            setPasswordError(err.response?.data?.error || "Verification failed");
            setPasswordAttemptSucceeded(false);
        } finally {
            setIsVerifyingPassword(false);
        }
    };

    const handleUploadSuccess = () => {
        fetchFilesList(); // Refresh list
        setSnackbar({ open: true, message: 'File uploaded successfully!', severity: 'success' });
    };

    const handleDeleteFileRequest = (file) => {
         if (!hasFolderAccess) { setSnackbar({open: true, message:'Unlock folder to delete.', severity:'warning'}); return; }
        setFileToDelete(file);
        setSnackbar(prev => ({...prev, open: false})); // Close previous snackbar
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        if (isDeleting) return;
        setOpenDeleteDialog(false);
        setFileToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;
        setIsDeleting(true);
        setSnackbar(prev => ({ ...prev, open: false }));
        try {
            await deleteFile(fileToDelete.id); // Backend checks session
            setSnackbar({ open: true, message: `Successfully deleted ${fileToDelete.name}.`, severity: 'success' });
            fetchFilesList(); // Refresh list
            handleCloseDeleteDialog();
        } catch (err) {
            console.error("Delete failed:", err);
            const errorMsg = err.response?.data?.error || err.message || 'Could not delete file.';
            setSnackbar({ open: true, message: `Delete Error: ${errorMsg}`, severity: 'error' });
            handleCloseDeleteDialog();
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewFileRequest = async (file, index) => {
         if (!hasFolderAccess) { setSnackbar({open: true, message:'Unlock folder to view files.', severity:'warning'}); return; }
        setIsFetchingUrl(true); setFileAccessError('');
        let signedUrl = signedUrlsCache[file.id];
        if (!signedUrl) {
            try {
                signedUrl = await getFileSignedUrl(file.id); // Backend checks session
                setSignedUrlsCache(prev => ({ ...prev, [file.id]: signedUrl }));
            } catch (err) {
                console.error("Error getting signed URL:", err);
                const errorMsg = err.response?.data?.error || err.message || 'Could not get file access URL.';
                setFileAccessError(`URL fetch failed for ${file.name}: ${errorMsg}`);
                setIsFetchingUrl(false); return;
            }
        }
        setIsFetchingUrl(false); setLightboxIndex(index); setLightboxOpen(true);
    };

    const handleLightboxClose = () => { setLightboxOpen(false); };

    const handleCopyShareLink = async (file) => {
        if (!hasFolderAccess) { setSnackbar({open: true, message:'Unlock folder to get share link.', severity:'warning'}); return; }
        setIsFetchingUrl(true); setFileAccessError(''); setSnackbar(prev => ({ ...prev, open: false }));
        let signedUrl = signedUrlsCache[file.id];
        if (!signedUrl) {
            try { signedUrl = await getFileSignedUrl(file.id); setSignedUrlsCache(prev => ({ ...prev, [file.id]: signedUrl })); }
            catch (err) { setFileAccessError(`URL fetch failed: ${err.message}`); setIsFetchingUrl(false); return; }
        }
        if (navigator.clipboard && signedUrl) {
            try { await navigator.clipboard.writeText(signedUrl); setSnackbar({ open: true, message: `Link for "${file.name}" copied!`, severity: 'success' }); }
            catch (err) { setFileAccessError(`Could not copy link: ${err.message}`); alert(`Manual copy:\n${signedUrl}`); }
        } else { setFileAccessError('Clipboard API unavailable.'); alert(`Clipboard unavailable. Link:\n${signedUrl}`); }
        setIsFetchingUrl(false);
    };

    const handleCloseSnackbar = (event, reason) => { if (reason === 'clickaway') return; setSnackbar(prev => ({ ...prev, open: false })); };


    // --- Prepare Slides for Lightbox ---
    const slides = files.map(file => {
        const url = signedUrlsCache[file.id];
        const slide = { src: url || '', title: file.name, description: `Size: ${formatFileSize(file.size)}`, download: url };
        if (file.mime_type?.startsWith('video/')) { slide.type = 'video'; slide.sources = [{ src: url || '', type: file.mime_type }]; }
        return slide;
    });


    // --- Render Page ---
    const isBusy = isDeleting || isFetchingUrl || isVerifyingPassword;
    // const isProtected = folderDetails?.is_protected || false; // No longer needed directly here, use hasFolderAccess/needsVerification

    return (
        <Box sx={{ position: 'relative', pb: 10, px: { xs: 1, sm: 2, md: 3 } }}>
            {/* Back Button */}
            <IconButton component={RouterLink} to="/" aria-label="back to home" sx={{ mb: 1 }}><ArrowBackIcon /></IconButton>

            {/* Folder Title & Lock Icon */}
            <Typography variant="h5" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2, typography: { xs: 'h6', sm: 'h5' } }}>
                {isLoadingFolder ? <CircularProgress size={20} sx={{ mr: 1 }} /> : (folderDetails?.is_protected ? <LockIcon fontSize="inherit" sx={{ mr: 1, color: hasFolderAccess ? 'success.main' : 'warning.main' }} /> : <LockOpenIcon fontSize="inherit" sx={{ mr: 1, color: 'success.main' }} />)}
                <span style={{ wordBreak: 'break-word' }}> Contents of: {folderDetails?.name || `Folder ${folderId}`} </span>
            </Typography>
            {errorFolder && !isLoadingFolder && (<Alert severity="error" sx={{ my: 2 }}>{errorFolder}</Alert>)}

            {/* Password Prompt Section */}
            {needsVerification && !hasFolderAccess && !isLoadingFolder && (
                 <Box component="form" onSubmit={handlePasswordSubmit} sx={{ my: 2, p: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: 'warning.light', borderRadius: 1 }}>
                     <Typography variant="body1" gutterBottom>Enter password to access this folder:</Typography>
                     <TextField margin="normal" required fullWidth name="folderPasswordPrompt" label="Folder Password" type="password" id="folderPasswordPrompt"
                        value={enteredPassword} onChange={(e) => setEnteredPassword(e.target.value)}
                        error={!!passwordError} helperText={passwordError} disabled={isVerifyingPassword}
                        autoComplete="current-password"
                     />
                      <Button type="submit" fullWidth variant="contained" sx={{ mt: 1, mb: 1 }} disabled={isVerifyingPassword}>
                         {isVerifyingPassword ? <CircularProgress size={24}/> : "Unlock Folder"}
                      </Button>
                 </Box>
            )}

            {/* FileUpload Component - Renders FAB, Input, Status Alerts */}
            {folderDetails && ( // Render only when folder details might be available
                 <FileUpload
                    folderId={folderId}
                    onUploadSuccess={handleUploadSuccess}
                    // Disable upload if busy OR if access not granted
                    disabled={isBusy || !hasFolderAccess}
                 />
            )}


            {/* --- Status indicators Stack --- */}
            <Stack spacing={1} sx={{ my: 2, minHeight: '20px' }}>
                {/* Display Delete Loading */}
                {isDeleting && <LinearProgress color="error"/> }
                {/* Display File Access (URL Fetch) Error */}
                {fileAccessError && <Alert severity="error" >{fileAccessError}</Alert>}
                {/* Display File Access (URL Fetch) Loading */}
                {isFetchingUrl && <LinearProgress color="info"/>}
            </Stack>
            {/* --- End Status Indicators Stack --- */}


            {/* Divider */}
            {hasFolderAccess && <Divider sx={{ my: 2 }} />}

            {/* --- File List Section --- */}
            {/* Render ONLY if access is granted */}
            {hasFolderAccess && (
                <FileListDisplay
                    files={files}
                    isLoading={isLoadingFiles}
                    error={errorFiles} // Show list-specific errors
                    onViewFile={handleViewFileRequest}
                    onDeleteFile={handleDeleteFileRequest}
                    onCopyLink={handleCopyShareLink}
                    // Disable list items if parent is busy
                    itemDisabled={isBusy}
                />
            )}
            {/* Message shown if protected and access not yet granted */}
             {folderDetails?.is_protected && needsVerification && !hasFolderAccess && !isLoadingFolder && (
                 <Typography sx={{ color: 'text.secondary', textAlign: 'center', my: 3 }}>
                     Enter password to view or manage files.
                 </Typography>
             )}
             {/* --- End File List Section --- */}


            {/* Delete Confirmation Dialog */}
            {/* Render only when needed */}
            {fileToDelete && (
                <DeleteConfirmDialog
                    open={openDeleteDialog}
                    onClose={handleCloseDeleteDialog}
                    onConfirm={handleConfirmDelete}
                    fileName={fileToDelete?.name}
                    isDeleting={isDeleting}
                    // Password props not needed for file delete dialog
                    // Errors handled by snackbar
                />
            )}


            {/* Lightbox */}
             <FileViewerLightbox
                open={lightboxOpen}
                index={lightboxIndex}
                slides={slides}
                onClose={handleLightboxClose}
            />

             {/* Snackbar for General Status Messages */}
             <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
             >
                 <Alert onClose={handleCloseSnackbar} severity={snackbar.severity || 'info'} sx={{ width: '100%' }} variant="filled">
                     {snackbar.message}
                 </Alert>
             </Snackbar>
        </Box>
    );
}

export default FolderDetailPage;