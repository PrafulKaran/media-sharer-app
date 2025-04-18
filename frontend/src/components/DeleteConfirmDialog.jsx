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
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography'; // Import Typography

// Accept dynamic title/text and password-related props
function DeleteConfirmDialog({
    open,
    onClose,
    onConfirm, // Parent's function to call on confirm click
    isDeleting,
    // deleteError, // General error now handled by parent's Snackbar
    dialogTitle = "Confirm Deletion",
    dialogText = "Are you sure? This action cannot be undone.",
    // --- Props for Optional Password Input ---
    requiresPassword = false, // Flag from parent
    password = '',             // Controlled value from parent
    onPasswordChange = () => {}, // Callback to update parent state
    passwordError = '',        // Password-specific error from parent
}) {

    const handleConfirmClick = () => { onConfirm(); };

    return (
        <Dialog
            open={open}
            onClose={onClose} // Allow closing via Esc/backdrop if not deleting
            disableEscapeKeyDown={isDeleting} // Prevent closing during delete operation
            aria-labelledby="delete-confirm-dialog-title"
            aria-describedby="delete-confirm-dialog-description"
            onBackdropClick={isDeleting ? () => {} : onClose} // Prevent close on backdrop click when deleting
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
                            error={!!passwordError} // Show input in error state based on prop
                            helperText={passwordError || ' '} // Show password error or empty space
                            disabled={isDeleting} // Disable field while delete is in progress
                            autoComplete="current-password" // Help browsers with password managers
                         />
                    </Box>
                )}

                {/* General delete error (if needed back here) */}
                {/* {!isDeleting && deleteError && !passwordError && (
                   <Alert severity="error" sx={{mt: 2}}>{`Error: ${deleteError}`}</Alert>
                )} */}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isDeleting}> Cancel </Button>
                <Button
                    onClick={handleConfirmClick} // Call internal handler -> calls parent onConfirm
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
  // deleteError: PropTypes.string, // General error prop removed
  dialogTitle: PropTypes.string,
  dialogText: PropTypes.string,
  // --- Password Props ---
  requiresPassword: PropTypes.bool,
  password: PropTypes.string,
  onPasswordChange: PropTypes.func,
  passwordError: PropTypes.string, // Specific password error message from parent
};

export default DeleteConfirmDialog;