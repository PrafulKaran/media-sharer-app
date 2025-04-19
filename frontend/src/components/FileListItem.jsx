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
import LinkIcon from '@mui/icons-material/Link';
// File Type Icons
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import VideocamIcon from '@mui/icons-material/Videocam';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArticleIcon from '@mui/icons-material/Article';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import DescriptionIcon from '@mui/icons-material/Description';
import { Typography } from '@mui/material';

// Helper function to get appropriate icon based on MIME type
const getFileIcon = (mimeType) => {
    if (!mimeType) return <InsertDriveFileIcon />;
    const type = mimeType.toLowerCase();
    if (type.startsWith('image/')) return <ImageIcon color="success" />;
    if (type.startsWith('audio/')) return <AudiotrackIcon color="secondary" />;
    if (type.startsWith('video/')) return <VideocamIcon color="info" />;
    if (type === 'application/pdf') return <PictureAsPdfIcon color="error" />;
    if (type.includes('wordprocessingml') || type.includes('msword')) return <ArticleIcon color="primary" />;
    if (type.includes('spreadsheetml') || type.includes('excel')) return <DescriptionIcon color="success" />;
    if (type.includes('presentationml') || type.includes('powerpoint')) return <DescriptionIcon color="warning" />;
    if (type.includes('zip')) return <FolderZipIcon color="action" />;
    if (type.startsWith('text/')) return <ArticleIcon color="disabled" />;
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


function FileListItem({ file, onViewClick, onDeleteClick, onCopyLinkClick, disabled }) {
    return (
        <ListItem
            disablePadding
            secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center' }}> {/* Container for action buttons */}
                    <IconButton
                        edge="end"
                        aria-label={`copy share link for ${file.name}`}
                        onClick={(e) => { e.stopPropagation(); onCopyLinkClick(file); }}
                        disabled={disabled}
                        title="Copy Share Link"
                        size="small"
                    // sx={{ mr: 0.5 }} // Space between buttons
                    >
                        <LinkIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton
                        edge="end"
                        aria-label={`delete file ${file.name}`}
                        onClick={(e) => { e.stopPropagation(); onDeleteClick(file); }}
                        disabled={disabled}
                        color="error"
                        title="Delete File"
                        size="small"
                    >
                        <DeleteIcon fontSize="inherit" />
                    </IconButton>
                </Box>
            }
        >
            <ListItemButton
                onClick={onViewClick} // Trigger lightbox/view
                disabled={disabled}
                // Responsive padding right to accommodate action buttons
                sx={{
                    paddingRight: { xs: '88px', sm: '96px' }, // Adjusted for two small icons
                    py: { xs: 0.5, sm: 1 } // Slightly less vertical padding on xs
                }}
            >
                <ListItemIcon sx={{ minWidth: '40px', mt: 0.5 }}>
                    {getFileIcon(file.mime_type)}
                </ListItemIcon>
                <ListItemText
                    primary={file.name}
                    secondaryTypographyProps={{ component: 'span', style: { wordBreak: 'break-word' } }}
                    secondary={
                        // Use span with display block for better wrapping control maybe
                        <>
                            <Typography variant="caption" component="span" display="block" sx={{ lineHeight: 1.2 }}>
                                Size: {formatFileSize(file.size)}
                            </Typography>
                            <Typography variant="caption" component="span" display="block" sx={{ lineHeight: 1.2 }}>
                                Uploaded: {new Date(file.uploaded_at).toLocaleDateString()}
                            </Typography>
                        </>
                    }
                    title={`Uploaded: ${new Date(file.uploaded_at).toLocaleString()}\nMIME Type: ${file.mime_type || 'N/A'}`}
                    // Prevent long text overflow
                    primaryTypographyProps={{ noWrap: true, style: { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                    sx={{ mr: 1 }} // Margin right for spacing
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
    onCopyLinkClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
};

export default FileListItem;