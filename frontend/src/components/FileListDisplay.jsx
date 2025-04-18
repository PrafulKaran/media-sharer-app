// src/components/FileListDisplay.jsx
import React from 'react';
import PropTypes from 'prop-types';
import FileListItem from './FileListItem'; // Import the item component

// MUI Imports
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

function FileListDisplay({ files, isLoading, error, onViewFile, onDeleteFile, itemDisabled }) {
    return (
        <Box>
            <Typography variant="h6" component="h2" gutterBottom>
                Files
            </Typography>

            {error && !isLoading && (
                <Alert severity="error" sx={{ my: 1 }}>{`Error loading files: ${error}`}</Alert>
            )}

            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress />
                </Box>
            )}

            {!isLoading && !error && (
                <List dense>
                    {files.length === 0 ? (
                        <ListItem>
                            <ListItemText primary="No files uploaded to this folder yet." />
                        </ListItem>
                    ) : (
                        files.map((file, index) => (
                            <React.Fragment key={file.id}>
                                <FileListItem
                                    file={file}
                                    onViewClick={() => onViewFile(file, index)} // Pass file and index
                                    onDeleteClick={onDeleteFile} // Pass file object
                                    disabled={itemDisabled} // Pass disabled state
                                />
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
  error: PropTypes.string,
  onViewFile: PropTypes.func.isRequired,
  onDeleteFile: PropTypes.func.isRequired,
  itemDisabled: PropTypes.bool, // General disabled state for items
};

export default FileListDisplay;