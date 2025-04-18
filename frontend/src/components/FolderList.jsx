// src/components/FolderList.jsx
import React from 'react'; // No longer need useState/useEffect here
import PropTypes from 'prop-types';
import { Link as RouterLink } from 'react-router-dom';

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem'; // Use ListItem to contain Button and Action
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import FolderIcon from '@mui/icons-material/Folder';
import LockIcon from '@mui/icons-material/Lock'; // For protected folders
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import IconButton from '@mui/material/IconButton'; // For Delete Button
import DeleteIcon from '@mui/icons-material/Delete'; // For Delete Button

// Define prop types
FolderList.propTypes = {
  folders: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      created_at: PropTypes.string.isRequired,
      is_protected: PropTypes.bool, // Expects this boolean flag
  })).isRequired,
  isLoading: PropTypes.bool.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onDeleteFolderRequest: PropTypes.func.isRequired, // Expects delete handler function
};


// Destructure props received from HomePage
function FolderList({ folders, isLoading, onRefresh, onDeleteFolderRequest }) {

  return (
    <Box sx={{ my: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" component="h2">
          Existing Folders
        </Typography>
        {/* Refresh Button */}
        <Button
           variant="outlined"
           size="small"
           onClick={onRefresh} // Use the passed-in function
           disabled={isLoading} // Use the passed-in loading state
           startIcon={isLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
        >
          Refresh
        </Button>
      </Box>

      {/* Loading Indicator */}
      {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress />
          </Box>
        )}

      {/* Folder List or "No folders" message */}
      {!isLoading && (
          <List dense> {/* `dense` reduces padding */}
            {folders.length === 0 ? (
              <ListItem>
                <ListItemText primary="No folders created yet." />
              </ListItem>
            ) : (
              // Map over the folders array received via props
              folders.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  {/* Use standard ListItem to easily add secondaryAction */}
                  <ListItem
                    disablePadding // Remove default padding from ListItem
                    secondaryAction={ // Add delete button to the right end
                        <IconButton
                            edge="end"
                            aria-label={`delete folder ${folder.name}`}
                            onClick={(e) => {
                                // Call the handler passed from HomePage
                                onDeleteFolderRequest(folder);
                            }}
                            disabled={isLoading} // Disable if parent is busy (e.g., during delete)
                            color="error" // Use error color for delete
                            title="Delete Folder" // Tooltip
                        >
                            <DeleteIcon fontSize='small'/>
                        </IconButton>
                    }
                  >
                    {/* Use ListItemButton for the main clickable area for navigation */}
                    <ListItemButton
                        component={RouterLink} // Navigate using React Router
                        to={`/folders/${folder.id}`} // Link to the detail page
                        sx={{ paddingRight: '56px' }} // Ensure text doesn't overlap delete button
                    >
                        <ListItemIcon sx={{ minWidth: '40px' }}>
                            <FolderIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                            primary={
                                // Display name and lock icon together if needed
                                <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                                    {folder.name}
                                    {folder.is_protected && (
                                        <LockIcon fontSize="inherit" sx={{ ml: 0.5, color: 'text.secondary', verticalAlign: 'middle' }} />
                                    )}
                                </Box>
                            }
                            secondary={`Created: ${new Date(folder.created_at).toLocaleDateString()}`}
                            // Prevent long text from breaking layout badly
                             primaryTypographyProps={{ style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                        />
                    </ListItemButton>
                  </ListItem>
                  {/* Add divider between items, but not after the last one */}
                  {index < folders.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))
            )}
          </List>
        )
      }
    </Box>
  );
}

export default FolderList;