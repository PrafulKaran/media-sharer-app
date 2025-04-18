// src/components/FileListItem.jsx
import React from 'react';
import PropTypes from 'prop-types';

// MUI Imports
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link'; // Share/Link Icon
// File Type Icons
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
    const k = 1024; if (typeof bytes !== 'number') bytes = Number(bytes);
    if (isNaN(bytes) || bytes <= 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const sizeInUnit = bytes / Math.pow(k, i);
    return parseFloat(sizeInUnit.toFixed(2)) + ' ' + sizes[i];
};


// Accept onCopyLinkClick prop
function FileListItem({ file, onViewClick, onDeleteClick, onCopyLinkClick, disabled }) {
    return (
        <ListItem
            disablePadding
            secondaryAction={ // Container for action icons
                <Box>
                    {/* Copy Link Button */}
                    <IconButton
                        edge="end"
                        aria-label={`copy share link for ${file.name}`}
                        onClick={(e) => { e.stopPropagation(); onCopyLinkClick(file); }}
                        disabled={disabled} // Disable based on parent state
                        title="Copy Share Link"
                        size="small"
                        sx={{ mr: 0.5 }} // Spacing between icons
                    >
                        <LinkIcon fontSize="inherit"/>
                    </IconButton>
                    {/* Delete Button */}
                    <IconButton
                        edge="end"
                        aria-label={`delete file ${file.name}`}
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(file); }}
                        disabled={disabled}
                        color="error"
                        title="Delete File"
                        size="small"
                    >
                        <DeleteIcon fontSize="inherit"/>
                    </IconButton>
                </Box>
            }
        >
            {/* Main clickable area for viewing */}
            <ListItemButton
                onClick={onViewClick} // Trigger view (lightbox)
                disabled={disabled}
                 // Responsive paddingRight for action buttons
                sx={{ paddingRight: { xs: '80px', sm: '96px' } }}
            >
                <ListItemIcon sx={{ minWidth: '40px' }}>
                    {getFileIcon(file.mime_type)}
                </ListItemIcon>
                <ListItemText
                    primary={file.name}
                    secondary={`Size: ${formatFileSize(file.size)} - Uploaded: ${new Date(file.uploaded_at).toLocaleDateString()}`}
                    title={`Uploaded: ${new Date(file.uploaded_at).toLocaleString()}\nMIME Type: ${file.mime_type || 'N/A'}`}
                    // Ensure long names don't break layout
                    primaryTypographyProps={{ noWrap: true, style: { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                />
            </ListItemButton>
        </ListItem>
    );
}

FileListItem.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    mime_type: PropTypes.string,
    size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    uploaded_at: PropTypes.string.isRequired,
  }).isRequired,
  onViewClick: PropTypes.func.isRequired,
  onDeleteClick: PropTypes.func.isRequired,
  onCopyLinkClick: PropTypes.func.isRequired, // Added prop type
  disabled: PropTypes.bool,
};

export default FileListItem;