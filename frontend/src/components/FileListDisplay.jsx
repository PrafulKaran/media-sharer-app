// src/components/FileListDisplay.jsx
import React from 'react';
import PropTypes from 'prop-types';
import FileListItem from './FileListItem'; // Import the item component

// MUI Imports
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem'; // Keep for "No files" message
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// Accept onCopyLink prop from parent (FolderDetailPage)
function FileListDisplay({ files, isLoading, error, onViewFile, onDeleteFile, onCopyLink, itemDisabled }) {
    return (
        <Box>
            <Typography variant="h6" component="h2" gutterBottom>
                Files
            </Typography>

            {/* Display error if loading failed */}
            {error && !isLoading && (
                <Alert severity="error" sx={{ my: 1 }}>{`Error loading files: ${error}`}</Alert>
            )}

            {/* Display loading indicator */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Display file list or 'no files' message */}
            {!isLoading && !error && (
                <List dense> {/* `dense` reduces vertical padding */}
                    {files.length === 0 ? (
                        <ListItem>
                            <ListItemText primary="No files uploaded to this folder yet." />
                        </ListItem>
                    ) : (
                        // Map over files and render FileListItem for each
                        files.map((file, index) => (
                            <React.Fragment key={file.id}>
                                <FileListItem
                                    file={file}
                                    // Pass down the appropriate handlers
                                    onViewClick={() => onViewFile(file, index)} // Pass file and index
                                    onDeleteClick={onDeleteFile} // Pass delete request handler
                                    onCopyLinkClick={onCopyLink} // <-- Pass copy handler down
                                    disabled={itemDisabled} // Pass disabled state
                                />
                                {/* Add divider between items */}
                                {index < files.length - 1 && <Divider variant="inset" component="li" />}
                            </React.Fragment>
                        ))
                    )}
                </List>
            )}
        </Box>
    );
}

FileListDisplay.propTypes = {
  files: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string, // Error message string
  onViewFile: PropTypes.func.isRequired, // Function to handle view click
  onDeleteFile: PropTypes.func.isRequired, // Function to handle delete request
  onCopyLink: PropTypes.func.isRequired, // <-- Add prop type for copy handler
  itemDisabled: PropTypes.bool, // General disabled state for items
};

export default FileListDisplay;