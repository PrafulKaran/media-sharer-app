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
import Snackbar from '@mui/material/Snackbar'; // For notifications
import CloseIcon from '@mui/icons-material/Close'; // For Snackbar close button
import Stack from '@mui/material/Stack'; // For status indicator layout
// File Icons (Ensure these are imported)
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
    verifyFolderPassword
    // uploadFile is handled by FileUpload component internally now
} from '../services/api';

// --- Helper Functions ---
const getFileIcon = (mimeType) => {
    if (!mimeType) return <InsertDriveFileIcon />;
    const type = mimeType.toLowerCase();
    if (type.startsWith('image/')) return <ImageIcon color="success" />;
    if (type.startsWith('audio/')) return <AudiotrackIcon color="secondary" />;
    if (type.startsWith('video/')) return <VideocamIcon color="info" />;
    if (type === 'application/pdf') return <PictureAsPdfIcon color="error" />;
    if (type.includes('wordprocessingml') || type.includes('msword')) return <ArticleIcon color="primary" />; // Word Docs
    if (type.includes('spreadsheetml') || type.includes('excel')) return <DescriptionIcon color="success"/>; // Excel - using Description for now
    if (type.includes('presentationml') || type.includes('powerpoint')) return <DescriptionIcon color="warning"/>; // PowerPoint - using Description
    if (type.includes('zip')) return <FolderZipIcon color="action"/>; // Zip archives
    if (type.startsWith('text/')) return <ArticleIcon color="disabled"/>; // Text files
    return <InsertDriveFileIcon />; // Default icon
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
    const [isPasswordProtected, setIsPasswordProtected] = useState(false);
    const [files, setFiles] = useState([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [errorFiles, setErrorFiles] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);
    const [enteredPassword, setEnteredPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [hasFolderAccess, setHasFolderAccess] = useState(false); // Track if session likely valid
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null); // Stores {id, name}
    const [isDeleting, setIsDeleting] = useState(false);
    // const [deleteStatus, setDeleteStatus] = useState(''); // Replaced by snackbar
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [signedUrlsCache, setSignedUrlsCache] = useState({});
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);
    const [fileAccessError, setFileAccessError] = useState(''); // Keep for non-snackbar errors
    // --- Snackbar State ---
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    // --- End State ---


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
        } catch (err) { setErrorFolder(err.response?.data?.error || err.message || 'Failed folder fetch'); setIsLoadingFiles(false); }
        finally { setIsLoadingFolder(false); }
    }, [folderId]); // fetchFilesList removed as direct dependency

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
            if (!hasFolderAccess) setHasFolderAccess(true); // Access confirmed if this succeeds
        } catch (err) {
            console.error("Error fetching files:", err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed fetch';
            if (err.response?.status === 401) {
                 setErrorFiles("Session expired or invalid. Please re-enter password.");
                 setHasFolderAccess(false); setNeedsVerification(true); setSignedUrlsCache({});
            } else { setErrorFiles(errorMsg); }
        } finally { setIsLoadingFiles(false); }
    }, [folderId, hasFolderAccess, isPasswordProtected]); // Correct dependencies

    // Initial data fetch effect
    useEffect(() => { fetchFolderData(); }, [fetchFolderData]);


    // --- Event Handlers ---

    // Password submission - calls verification API, then fetches files on success
    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        if (!enteredPassword) { setPasswordError("Password required."); return; }
        setIsVerifyingPassword(true); setPasswordError(''); setErrorFiles(''); // Clear errors
        try {
            await verifyFolderPassword(folderId, enteredPassword);
            console.log("Password verified via API.");
            setHasFolderAccess(true); // Grant access conceptually
            setNeedsVerification(false); // Hide prompt
            setEnteredPassword('');
            fetchFilesList(); // Fetch files now that session is set
        } catch (err) {
            console.error("Password verification failed:", err);
            setPasswordError(err.response?.data?.error || "Verification failed");
            setHasFolderAccess(false);
        } finally {
            setIsVerifyingPassword(false);
        }
    };

    // Upload success callback - just refresh list and show snackbar
    const handleUploadSuccess = () => {
        fetchFilesList();
        setSnackbar({ open: true, message: 'File uploaded successfully!', severity: 'success' });
    };

    // Delete handlers - check frontend access state first
    const handleDeleteFileRequest = (file) => {
         if (!hasFolderAccess && isPasswordProtected) { setSnackbar({open: true, message:'Enter password to delete.', severity:'warning'}); return; }
        setFileToDelete(file);
        // setDeleteStatus(''); // Not needed, using snackbar for final status
        setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => { if(isDeleting) return; setOpenDeleteDialog(false); setFileToDelete(null); };
    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;
        setIsDeleting(true);
        // setDeleteStatus(''); // Clear previous potential errors if any were stored
        try {
            await deleteFile(fileToDelete.id);
            setSnackbar({ open: true, message: `Successfully deleted ${fileToDelete.name}.`, severity: 'success' });
            fetchFilesList(); // Refresh list
            handleCloseDeleteDialog(); // Close dialog on success
        } catch (err) {
            console.error("Delete failed:", err);
            const errorMsg = err.response?.data?.error || err.message || 'Could not delete file.';
            // Show error in Snackbar instead of state/alert
            setSnackbar({ open: true, message: `Delete Error: ${errorMsg}`, severity: 'error' });
            handleCloseDeleteDialog(); // Close dialog even on error
        } finally {
            setIsDeleting(false);
            // Don't need to manage closing dialog here if error keeps it open,
            // but we decided to close it always in the handlers above.
        }
    };

    // View/Lightbox handlers - check frontend access state first
    const handleViewFileRequest = async (file, index) => {
         if (!hasFolderAccess && isPasswordProtected) { setSnackbar({open: true, message:'Enter password to view file.', severity:'warning'}); return; }
        setIsFetchingUrl(true); setFileAccessError(''); let signedUrl = signedUrlsCache[file.id];
        if (!signedUrl) { try { signedUrl = await getFileSignedUrl(file.id); setSignedUrlsCache(prev => ({ ...prev, [file.id]: signedUrl })); } catch (err) { setFileAccessError(`URL fetch failed: ${err.message}`); setIsFetchingUrl(false); return; } }
        setIsFetchingUrl(false); setLightboxIndex(index); setLightboxOpen(true);
    };
    const handleLightboxClose = () => { setLightboxOpen(false); };

    // Copy Share Link handler - uses Snackbar for success
    const handleCopyShareLink = async (file) => {
        if (!hasFolderAccess && isPasswordProtected) { setSnackbar({open: true, message:'Enter password to get share link.', severity:'warning'}); return; }
        setIsFetchingUrl(true); setFileAccessError(''); setSnackbar(prev => ({ ...prev, open: false })); // Clear previous snackbar
        let signedUrl = signedUrlsCache[file.id]; // Check cache
        if (!signedUrl) { try { signedUrl = await getFileSignedUrl(file.id); setSignedUrlsCache(prev => ({ ...prev, [file.id]: signedUrl })); } catch (err) { setFileAccessError(`URL fetch failed: ${err.message}`); setIsFetchingUrl(false); return; } }

        if (navigator.clipboard && signedUrl) {
            try { await navigator.clipboard.writeText(signedUrl); setSnackbar({ open: true, message: `Link for "${file.name}" copied!`, severity: 'success' }); } // Use snackbar
            catch (err) { setFileAccessError(`Could not copy link: ${err.message}`); alert(`Could not auto-copy. Link:\n${signedUrl}`); }
        } else { setFileAccessError('Clipboard API unavailable.'); alert(`Clipboard unavailable. Link:\n${signedUrl}`); }
        setIsFetchingUrl(false);
    };
    // Snackbar close handler
    const handleCloseSnackbar = (event, reason) => { if (reason === 'clickaway') { return; } setSnackbar(prev => ({ ...prev, open: false })); };


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
        <Box sx={{ position: 'relative', pb: 10, px: { xs: 1, sm: 2, md: 3 } }}>
            {/* Back Button */}
            <IconButton component={RouterLink} to="/" aria-label="back to home" sx={{ mb: 1 }}><ArrowBackIcon /></IconButton>

            {/* Folder Title & Lock Icon */}
            <Typography variant="h5" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 2, typography: { xs: 'h6', sm: 'h5' } }}>
                {isLoadingFolder ? <CircularProgress size={20} sx={{ mr: 1 }} /> : (isPasswordProtected ? <LockIcon fontSize="inherit" sx={{ mr: 1, color: hasFolderAccess ? 'success.main' : 'warning.main' }} /> : <LockOpenIcon fontSize="inherit" sx={{ mr: 1, color: 'success.main' }} />)}
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
            <FileUpload folderId={folderId} onUploadSuccess={handleUploadSuccess} disabled={isBusy || !hasFolderAccess} />

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
            {hasFolderAccess && (
                <FileListDisplay
                    files={files}
                    isLoading={isLoadingFiles}
                    error={errorFiles} // Show list-specific errors
                    onViewFile={handleViewFileRequest}
                    onDeleteFile={handleDeleteFileRequest}
                    onCopyLink={handleCopyShareLink}
                    itemDisabled={isBusy}
                />
            )}
            {/* No Access Message */}
             {needsVerification && !hasFolderAccess && !isLoadingFolder && (
                 <Typography sx={{ color: 'text.secondary', textAlign: 'center', my: 3 }}>
                     Enter password to view or manage files.
                 </Typography>
             )}
             {/* --- End File List Section --- */}


            {/* Delete Confirmation Dialog */}
            {folderDetails && fileToDelete && ( // Render only when needed
                <DeleteConfirmDialog
                    open={openDeleteDialog}
                    onClose={handleCloseDeleteDialog}
                    onConfirm={handleConfirmDelete}
                    fileName={fileToDelete?.name}
                    isDeleting={isDeleting}
                    // Password props not needed for file deletion dialog
                    // deleteError prop is now handled by snackbar mostly
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
                autoHideDuration={4000} // Hide after 4 seconds
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
             >
                 {/* Embed Alert inside Snackbar for severity styling */}
                 {/* Note: onClose on Alert is important for the 'x' button to work */}
                 <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
                     {snackbar.message}
                 </Alert>
             </Snackbar>
        </Box>
    );
}

export default FolderDetailPage;