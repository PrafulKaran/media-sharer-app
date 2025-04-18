// src/components/DeleteConfirmDialog.jsx
import React from 'react';
import PropTypes from 'prop-types';

// MUI Imports
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField'; // Import TextField
import Box from '@mui/material/Box';
import { Typography } from '@mui/material';

// Accept dynamic title/text and new password-related props
function DeleteConfirmDialog({
    open,
    onClose,
    onConfirm, // Parent's function to call on confirm click
    isDeleting,
    deleteError, // General delete error message from parent
    dialogTitle = "Confirm Deletion",
    dialogText = "Are you sure? This action cannot be undone.",
    // --- New Props for Password ---
    requiresPassword = false, // Flag to show password field
    password = '',             // Controlled input value for password
    onPasswordChange = () => {}, // Callback to update password in parent state
    passwordError = '',        // Specific error message for the password field
    // --- End New Props ---
}) {

    // Internal handler for the confirm button click
    const handleConfirmClick = () => {
        // The parent's onConfirm function needs to handle reading the password state if requiresPassword is true
        onConfirm();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose} // Allow closing via Esc/backdrop if not deleting
            disableEscapeKeyDown={isDeleting} // Prevent closing during delete operation
            aria-labelledby="delete-confirm-dialog-title"
            aria-describedby="delete-confirm-dialog-description"
            // Prevent backdrop click from closing if password is required and might have error
            onBackdropClick={isDeleting ? () => {} : onClose}
        >
            <DialogTitle id="delete-confirm-dialog-title"> {dialogTitle} </DialogTitle>
            <DialogContent>
                <DialogContentText id="delete-confirm-dialog-description">
                   {dialogText}
                </DialogContentText>

                {/* Conditionally render password input field */}
                {requiresPassword && (
                    <Box sx={{ mt: 2 }}>
                         <Typography variant="body2" color="text.secondary" gutterBottom>
                             Enter password to confirm deletion:
                         </Typography>
                         <TextField
                            autoFocus // Focus password field when shown
                            margin="dense"
                            id="delete-password-confirm"
                            label="Password"
                            type="password"
                            fullWidth
                            variant="outlined"
                            value={password} // Controlled component
                            onChange={onPasswordChange} // Update parent state on change
                            error={!!passwordError} // Show input in error state
                            helperText={passwordError || ' '} // Show password error or empty space to maintain layout
                            disabled={isDeleting} // Disable field while delete is in progress
                         />
                    </Box>
                )}

                {/* Show general delete error (if not a password error) */}
                {!isDeleting && deleteError && !passwordError && (
                   <Alert severity="error" sx={{mt: 2}}>{`Error: ${deleteError}`}</Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isDeleting}> Cancel </Button>
                <Button
                    onClick={handleConfirmClick} // Call internal handler
                    color="error"
                    variant="contained"
                    // Disable if deleting OR if password is required but not entered
                    disabled={isDeleting || (requiresPassword && !password)}
                    autoFocus={!requiresPassword} // AutoFocus delete button only if password not needed
                >
                    {isDeleting ? <CircularProgress size={20} color="inherit"/> : 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

DeleteConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  isDeleting: PropTypes.bool.isRequired,
  deleteError: PropTypes.string, // General error from parent
  dialogTitle: PropTypes.string,
  dialogText: PropTypes.string,
  // --- New PropTypes ---
  requiresPassword: PropTypes.bool,
  password: PropTypes.string,
  onPasswordChange: PropTypes.func,
  passwordError: PropTypes.string, // Specific password error from parent
};

export default DeleteConfirmDialog;