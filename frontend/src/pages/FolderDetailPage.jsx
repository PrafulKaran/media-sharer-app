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
import Stack from '@mui/material/Stack'; // Used for status indicators

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
} from '../services/api';

// Helper function to format file size
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
    const [copyStatus, setCopyStatus] = useState({ open: false, message: '' });

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
        } catch (err) { setErrorFolder(err.response?.data?.error || err.message || 'Failed folder fetch'); setIsLoadingFiles(false); } // Stop file loading if folder fails
        finally { setIsLoadingFolder(false); }
    }, [folderId]); // fetchFilesList removed

    const fetchFilesList = useCallback(async (password = null) => { // password only used for initial verify trigger
        if (!folderId) return;
        if (isPasswordProtected && !hasFolderAccess && !password) { // Check access grant only if protected and not submitting password
            console.log("Skipping file fetch: Access not granted yet.");
            if (isLoadingFiles) setIsLoadingFiles(false); return;
        }
        setIsLoadingFiles(true); setErrorFiles(''); setPasswordError(''); setFiles([]);
        try {
            const data = await listFiles(folderId); // API call doesn't need password anymore
            setFiles(data || []);
            if (!hasFolderAccess) setHasFolderAccess(true); // Access confirmed if this succeeds
            if (password) { setNeedsVerification(false); setEnteredPassword(''); } // Clear prompt if password submit led here
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Failed fetch';
            if (err.response?.status === 401) { // Session invalid/expired
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
        try {
            await verifyFolderPassword(folderId, enteredPassword);
            setHasFolderAccess(true); setNeedsVerification(false); setEnteredPassword(''); fetchFilesList(); // Fetch files on success
        } catch (err) { setPasswordError(err.response?.data?.error || "Verification failed"); setHasFolderAccess(false); }
        finally { setIsVerifyingPassword(false); }
    };

    const handleUploadSuccess = () => { fetchFilesList(); };

    const handleDeleteFileRequest = (file) => {
        if (!hasFolderAccess && isPasswordProtected) { alert("Unlock folder to delete files."); return; }
        setFileToDelete(file); setDeleteStatus(''); setOpenDeleteDialog(true);
    };
    const handleCloseDeleteDialog = () => { if (isDeleting) return; setOpenDeleteDialog(false); setFileToDelete(null); };
    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;
        setIsDeleting(true); setDeleteStatus('');
        try { await deleteFile(fileToDelete.id); fetchFilesList(); }
        catch (err) { setDeleteStatus(err.response?.data?.error || 'Delete failed.'); }
        finally { setIsDeleting(false); if (!deleteStatus) { setOpenDeleteDialog(false); setFileToDelete(null); } }
    };

    const handleViewFileRequest = async (file, index) => {
        if (!hasFolderAccess && isPasswordProtected) { alert("Unlock folder to view files."); return; }
        setIsFetchingUrl(true); setFileAccessError(''); let signedUrl = signedUrlsCache[file.id];
        if (!signedUrl) { try { signedUrl = await getFileSignedUrl(file.id); setSignedUrlsCache(prev => ({ ...prev, [file.id]: signedUrl })); } catch (err) { setFileAccessError(`URL fetch failed: ${err.message}`); setIsFetchingUrl(false); return; } }
        setIsFetchingUrl(false); setLightboxIndex(index); setLightboxOpen(true);
    };
    const handleLightboxClose = () => { setLightboxOpen(false); };

    const handleCopyShareLink = async (file) => {
        if (!hasFolderAccess && isPasswordProtected) { alert("Unlock folder to get share link."); return; }
        setIsFetchingUrl(true); setFileAccessError(''); setCopyStatus({ open: false, message: '' });
        let signedUrl = null;
        try { signedUrl = await getFileSignedUrl(file.id); setSignedUrlsCache(prev => ({ ...prev, [file.id]: signedUrl })); }
        catch (err) { setFileAccessError(`URL fetch failed: ${err.message}`); setIsFetchingUrl(false); return; }
        if (navigator.clipboard && signedUrl) {
            try { await navigator.clipboard.writeText(signedUrl); setCopyStatus({ open: true, message: `Link for "${file.name}" copied!` }); }
            catch (err) { setFileAccessError(`Could not copy link: ${err.message}`); alert(`Could not auto-copy. Link:\n${signedUrl}`); }
        } else { setFileAccessError('Clipboard API unavailable.'); alert(`Clipboard unavailable. Link:\n${signedUrl}`); }
        setIsFetchingUrl(false);
    };
    const handleCloseCopySnackbar = (event, reason) => { if (reason === 'clickaway') { return; } setCopyStatus({ open: false, message: '' }); };


    // --- Prepare Slides for Lightbox ---
    const slides = files.map(file => {
        const url = signedUrlsCache[file.id];
        const slide = { src: url || '', title: file.name, description: `Size: ${formatFileSize(file.size)}`, download: url };
        if (file.mime_type?.startsWith('video/')) { slide.type = 'video'; slide.sources = [{ src: url || '', type: file.mime_type }]; }
        return slide;
    });

    // --- Render Page ---
    const isBusy = isDeleting || isFetchingUrl || isVerifyingPassword; // Used to disable list items/buttons

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
                <Box component="form" onSubmit={handlePasswordSubmit} sx={{ my: 2, p: { xs: 1, sm: 2 }, border: '1px solid', borderColor: 'warning.light', borderRadius: 1 }}>
                    <Typography variant="body1" gutterBottom>Enter password to access this folder:</Typography>
                    <TextField margin="normal" required fullWidth name="folderPasswordPrompt" label="Folder Password" type="password" id="folderPasswordPrompt"
                        value={enteredPassword} onChange={(e) => setEnteredPassword(e.target.value)}
                        error={!!passwordError} helperText={passwordError} disabled={isVerifyingPassword}
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 1, mb: 1 }} disabled={isVerifyingPassword}>
                        {isVerifyingPassword ? <CircularProgress size={24} /> : "Unlock Folder"}
                    </Button>
                </Box>
            )}

            {/* FileUpload Component - Renders FAB, Input, Status */}
            {/* Placed here visually, but FAB is fixed position */}
            <FileUpload
                folderId={folderId}
                onUploadSuccess={handleUploadSuccess}
                disabled={isBusy || !hasFolderAccess} // Disable upload if busy or no access
            />

            {/* --- Status indicators Stack --- */}
            {/* Stack provides consistent vertical spacing */}
            <Stack spacing={1} sx={{ my: 2, minHeight: '20px' }}> {/* Min height prevents layout jump */}
                {/* Display Delete Error */}
                {!isDeleting && deleteStatus && (<Alert severity="error" >{`Delete Error: ${deleteStatus}`}</Alert>)}
                {/* Display Delete Loading */}
                {isDeleting && <LinearProgress color="error" />}
                {/* Display File Access Error */}
                {fileAccessError && <Alert severity="error" >{fileAccessError}</Alert>}
                {/* Display File Access Loading */}
                {isFetchingUrl && <LinearProgress color="info" />}
            </Stack>
            {/* --- End Status Indicators Stack --- */}

            {/* Divider */}
            {hasFolderAccess && <Divider sx={{ my: 2 }} />}

            {/* --- File List Section --- */}
            {hasFolderAccess && (
                <FileListDisplay
                    files={files}
                    isLoading={isLoadingFiles}
                    error={errorFiles}
                    onViewFile={handleViewFileRequest}
                    onDeleteFile={handleDeleteFileRequest}
                    onCopyLink={handleCopyShareLink}
                    itemDisabled={isBusy} // Disable list items if deleting/fetching URL/verifying password
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
            {folderDetails && fileToDelete && ( // Ensure props have value
                <DeleteConfirmDialog
                    open={openDeleteDialog}
                    onClose={handleCloseDeleteDialog}
                    onConfirm={handleConfirmDelete}
                    fileName={fileToDelete?.name} // Pass filename for dialog text
                    isDeleting={isDeleting}
                    deleteError={deleteStatus} // Pass general delete error
                // Password props not needed here as check happens before opening dialog
                />
            )}

            {/* Lightbox */}
            <FileViewerLightbox
                open={lightboxOpen}
                index={lightboxIndex}
                slides={slides}
                onClose={handleLightboxClose}
            />

            {/* Snackbar for Copy Success Message */}
            <Snackbar
                open={copyStatus.open}
                autoHideDuration={4000}
                onClose={handleCloseCopySnackbar}
                message={copyStatus.message}
                action={
                    <IconButton size="small" aria-label="close" color="inherit" onClick={handleCloseCopySnackbar}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                }
            />
        </Box>
    );
}

export default FolderDetailPage;