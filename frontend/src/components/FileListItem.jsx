// src/components/FileListItem.jsx
import React from 'react';
import PropTypes from 'prop-types';

// MUI Imports
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import VideocamIcon from '@mui/icons-material/Videocam';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// Helper function to get appropriate icon based on MIME type
const getFileIcon = (mimeType) => {
    if (!mimeType) return <InsertDriveFileIcon />;
    if (mimeType.startsWith('image/')) return <ImageIcon color="success" />;
    if (mimeType.startsWith('audio/')) return <AudiotrackIcon color="secondary" />;
    if (mimeType.startsWith('video/')) return <VideocamIcon color="info" />;
    if (mimeType === 'application/pdf') return <PictureAsPdfIcon color="error" />;
    return <InsertDriveFileIcon />;
};

// Helper function to format file size
const formatFileSize = (bytes) => {
    if (bytes === 0 || !bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    if (typeof bytes !== 'number') bytes = Number(bytes);
    if (isNaN(bytes) || bytes <= 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeInUnit = bytes / Math.pow(k, i);
    return parseFloat(sizeInUnit.toFixed(2)) + ' ' + sizes[i];
};


function FileListItem({ file, onViewClick, onDeleteClick, disabled }) {
    return (
        <ListItemButton
            onClick={onViewClick} // Trigger view/lightbox
            disabled={disabled}
            // No secondaryAction prop on ListItemButton, handle IconButton separately
            sx={{ paddingRight: '56px' }} // Add padding to prevent text overlap with IconButton
        >
            <ListItemIcon sx={{ minWidth: '40px' }}>
                {getFileIcon(file.mime_type)}
            </ListItemIcon>
            <ListItemText
                primary={file.name}
                secondary={`Size: ${formatFileSize(file.size)} - Uploaded: ${new Date(file.uploaded_at).toLocaleDateString()}`}
                title={`Uploaded: ${new Date(file.uploaded_at).toLocaleString()}\nMIME Type: ${file.mime_type || 'N/A'}`}
                primaryTypographyProps={{ style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }} // Prevent long names overflowing
            />
            {/* Position the delete button absolutely within the ListItem context */}
            <IconButton
                edge="end"
                aria-label="delete"
                onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering ListItemButton click
                    onDeleteClick(file);
                }}
                disabled={disabled}
                color="error"
                sx={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}
            >
                <DeleteIcon fontSize="small"/>
            </IconButton>
        </ListItemButton>
    );
}

FileListItem.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    mime_type: PropTypes.string,
    size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), // Size can be number or null/string from DB sometimes
    uploaded_at: PropTypes.string.isRequired,
  }).isRequired,
  onViewClick: PropTypes.func.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default FileListItem;