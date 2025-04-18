// frontend/src/services/api.js
import axios from 'axios';

// Define the base URL for your Flask API
const API_BASE_URL = 'http://localhost:5000/api';

// Create an axios instance configured for base URL and sending credentials
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send session cookies
});

// --- API Functions ---

/** Pings the backend server. */
export const pingBackend = async () => {
  const response = await apiClient.get('/ping');
  return response.data;
};

/** Tests the backend's connection to the database. */
export const testDbConnection = async () => {
  const response = await apiClient.get('/test-db');
  return response.data;
};

/** Creates a new folder. */
export const createFolder = async (folderData) => {
  const response = await apiClient.post('/folders', folderData);
  return response.data;
};

/** Fetches a list of all folders (includes is_protected flag). */
export const listFolders = async () => {
  const response = await apiClient.get('/folders');
  return response.data;
};

/** Fetches details for a specific folder (includes is_protected flag). */
export const getFolderDetails = async (folderId) => {
    if (!folderId) throw new Error("Folder ID is required.");
    const response = await apiClient.get(`/folders/${folderId}`);
    return response.data;
};

/** Verifies folder password and sets backend session. */
export const verifyFolderPassword = async (folderId, password) => {
    if (!folderId || !password) throw new Error("Folder ID and password required.");
    const response = await apiClient.post(`/folders/${folderId}/verify-password`, { password });
    return response.data;
};


/** Uploads a file to a specific folder. */
export const uploadFile = async (file, folderId, onUploadProgress) => {
  if (!file || !folderId) { throw new Error("File and Folder ID are required for upload."); }
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await apiClient.post(`/folders/${folderId}/files`, formData, {
      onUploadProgress: onUploadProgress,
    });
    return response.data;
  } catch (error) { console.error("Upload Error:", error.response || error); throw error; }
};

/** Fetches a list of files within a specific folder (checks session on backend). */
export const listFiles = async (folderId) => {
  if (!folderId) throw new Error("Folder ID required to list files.");
  try {
      const response = await apiClient.get(`/folders/${folderId}/files`);
      return response.data;
  } catch(error) { console.error("Error listing files:", error.response || error); throw error; }
};

/** Deletes a specific file by its ID (checks session on backend). */
export const deleteFile = async (fileId) => {
  if (!fileId) throw new Error("File ID is required for deletion.");
  await apiClient.delete(`/files/${fileId}`);
};

/** Fetches a temporary signed URL for accessing a file (checks session on backend). */
export const getFileSignedUrl = async (fileId) => {
  if (!fileId) throw new Error("File ID is required to get signed URL.");
  const response = await apiClient.get(`/files/${fileId}/signed-url`);
  if (!response.data?.signedUrl) {
      const backendError = response.data?.error || 'Signed URL key missing';
      throw new Error(`Failed to retrieve signed URL: ${backendError}`);
  }
  return response.data.signedUrl;
};


// --- ADD THIS FUNCTION BACK ---
/**
 * Deletes a specific folder and its contents.
 * Requires password in body data if folder is protected.
 * @param {number|string} folderId The ID of the folder to delete.
 * @param {string} [password] Optional password if folder is protected.
 * @returns {Promise<void>} Promise resolving when deletion is successful.
 */
export const deleteFolder = async (folderId, password) => {
    if (!folderId) throw new Error("Folder ID is required for deletion.");

    // Prepare config for DELETE request
    // Axios DELETE can send a body using the 'data' key in the config object
    const config = {
        data: password ? { password: password } : undefined, // Send password in body if provided
        withCredentials: true // Ensure session cookie is sent
    };

    // Send DELETE request to /api/folders/:folderId endpoint with config
    await apiClient.delete(`/folders/${folderId}`, config);
    // No data returned on success (204)
};

/**
 * Checks if the current session allows access to a folder.
 * @param {number|string} folderId The ID of the folder.
 * @returns {Promise<{access: boolean, reason?: string}>} Promise resolving with access status.
 */
export const checkFolderAccess = async (folderId) => {
  if (!folderId) throw new Error("Folder ID is required to check access.");
  try {
      const response = await apiClient.get(`/folders/${folderId}/check-access`);
      return response.data; // Should be { access: true/false, reason: '...' }
  } catch (error) {
      // Handle specific errors, e.g., 404 shouldn't happen if folder exists
      // If backend returns 401, Axios might throw error. Return access: false.
      if (error.response && error.response.status === 401) {
          console.log("Access check returned 401 (Unauthorized)");
          return { access: false, reason: error.response.data?.error || "Unauthorized" };
      }
      // Re-throw other errors (like 500, network errors)
      console.error("Error checking folder access:", error.response || error.request || error.message);
      throw error;
  }
};

// --- END ADDITION ---


// --- End API Functions ---