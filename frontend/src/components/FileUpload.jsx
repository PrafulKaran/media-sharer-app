// src/components/FileUpload.jsx
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { uploadFile } from '../services/api';

// MUI Imports
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

// Accept folderId, onUploadSuccess, and a general disabled prop
function FileUpload({ folderId, onUploadSuccess, disabled }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ message: '', severity: '' });
    const fileInputRef = useRef(null);

    const handleFabClick = () => {
        // Don't proceed if globally disabled
        if (disabled) return;
        setUploadStatus({ message: '', severity: '' });
        setSelectedFile(null);
        fileInputRef.current?.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            handleUpload(file); // Automatically upload
        } else {
           setSelectedFile(null);
        }
        event.target.value = null;
    };

    const handleUpload = async (fileToUpload) => {
        if (!fileToUpload) return;
        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatus({ message: `Uploading ${fileToUpload.name}...`, severity: 'info' });
        try {
          const onUploadProgress = (progressEvent) => {
            if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percentCompleted);
            }
          };
          const newFileData = await uploadFile(fileToUpload, folderId, onUploadProgress);
          setUploadStatus({ message: `Successfully uploaded ${newFileData.name}!`, severity: 'success' });
          setSelectedFile(null);
          onUploadSuccess(); // Notify parent component
        } catch (err) {
          console.error("Upload failed:", err);
          const errorMsg = err.response?.data?.error || err.message || 'File upload failed';
          setUploadStatus({ message: `Error: ${errorMsg}`, severity: 'error' });
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
     };

    return (
        <>
            {/* Upload Status/Progress Display */}
            <Box sx={{ my: 2, minHeight: '60px' }}>
                {isUploading && (
                    <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>{uploadStatus.message}</Typography>
                        <LinearProgress variant="determinate" value={uploadProgress} sx={{ width: '80%' }}/>
                        <Typography variant="caption">{`${uploadProgress}%`}</Typography>
                    </Box>
                )}
                {/* Show status message only when NOT uploading */}
                {!isUploading && uploadStatus.message && (
                    <Alert severity={uploadStatus.severity || 'info'} sx={{ width: '100%' }}>
                        {uploadStatus.message}
                    </Alert>
                )}
            </Box>

            {/* Hidden File Input */}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

            {/* Floating Action Button for Upload */}
            <Fab
                color="primary"
                aria-label="add file"
                onClick={handleFabClick}
                // Disable if globally disabled OR if currently uploading
                disabled={disabled || isUploading}
                sx={{ position: 'fixed', bottom: 32, right: 32, }}
            >
               {isUploading ? <CircularProgress size={24} color="inherit"/> : <AddIcon />}
            </Fab>
        </>
    );
}

FileUpload.propTypes = {
  folderId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onUploadSuccess: PropTypes.func.isRequired,
  disabled: PropTypes.bool, // General disabled state from parent
};

export default FileUpload;