// frontend/src/services/api.js
import axios from 'axios';

// Define the base URL for your Flask API (ensure this matches your backend)
const API_BASE_URL = 'http://localhost:5000/api';

// Create an axios instance configured for the base URL and sending credentials
// REMOVED the default Content-Type header to allow Axios to set it automatically
// based on the request data (JSON vs FormData).
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // headers: { 'Content-Type': 'application/json', }, // <-- REMOVED this line
  withCredentials: true, // Crucial for sending session cookies
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
  // apiClient will automatically use application/json for this object
  const response = await apiClient.post('/folders', folderData);
  return response.data;
};

/** Fetches a list of all folders. */
export const listFolders = async () => {
  const response = await apiClient.get('/folders');
  return response.data;
};

/** Fetches details for a specific folder (including is_protected flag). */
export const getFolderDetails = async (folderId) => {
    if (!folderId) throw new Error("Folder ID is required.");
    const response = await apiClient.get(`/folders/${folderId}`);
    return response.data;
};

/** Verifies folder password and sets backend session. */
export const verifyFolderPassword = async (folderId, password) => {
    if (!folderId || !password) throw new Error("Folder ID and password required.");
    // apiClient will automatically use application/json for this object
    const response = await apiClient.post(`/folders/${folderId}/verify-password`, { password });
    return response.data;
};


/** Uploads a file to a specific folder. */
export const uploadFile = async (file, folderId, onUploadProgress) => {
  if (!file || !folderId) {
    throw new Error("File and Folder ID are required for upload.");
  }
  const formData = new FormData();
  formData.append('file', file); // Key 'file' must match backend

  try {
    // Pass FormData directly. Axios will set Content-Type to multipart/form-data
    const response = await apiClient.post(`/folders/${folderId}/files`, formData, {
      // No 'headers' needed here for Content-Type
      onUploadProgress: onUploadProgress, // Pass progress callback
      // withCredentials is set on the instance, no need to repeat unless overriding
    });
    return response.data; // Return file metadata on success
  } catch (error) {
    console.error("Error in uploadFile API service:", error.response || error.request || error.message);
    throw error; // Re-throw for component error handling
  }
};

/** Fetches a list of files within a specific folder (checks session on backend). */
export const listFiles = async (folderId) => {
  if (!folderId) throw new Error("Folder ID required to list files.");
  try {
      // GET request - backend verifies session via cookie
      const response = await apiClient.get(`/folders/${folderId}/files`);
      return response.data;
  } catch(error) {
      console.error("Error listing files:", error.response || error.request || error.message);
      throw error;
  }
};

/** Deletes a specific file by its ID (checks session on backend). */
export const deleteFile = async (fileId) => {
  if (!fileId) throw new Error("File ID is required for deletion.");
  // DELETE request - backend verifies session via cookie
  await apiClient.delete(`/files/${fileId}`);
};

/** Fetches a temporary signed URL for accessing a file (checks session on backend). */
export const getFileSignedUrl = async (fileId) => {
  if (!fileId) throw new Error("File ID is required to get signed URL.");
   // GET request - backend verifies session via cookie
  const response = await apiClient.get(`/files/${fileId}/signed-url`);
  if (!response.data?.signedUrl) {
      const backendError = response.data?.error || 'Signed URL key missing';
      throw new Error(`Failed to retrieve signed URL: ${backendError}`);
  }
  return response.data.signedUrl;
};
// frontend/src/services/api.js
// ... (imports and other functions) ...

/**
 * Deletes a specific folder and its contents.
 * Requires password in body if folder is protected.
 * @param {number|string} folderId The ID of the folder to delete.
 * @param {string} [password] Optional password if folder is protected.
 * @returns {Promise<void>} Promise resolving when deletion is successful.
 */
export const deleteFolder = async (folderId, password) => { // Added password parameter
  if (!folderId) throw new Error("Folder ID is required for deletion.");

  // Prepare config for DELETE request
  const config = {
      // Send password in data payload if provided
      data: password ? { password: password } : undefined,
      withCredentials: true // Ensure session cookies are sent if needed elsewhere
  };

  // Send DELETE request to /api/folders/:folderId endpoint
  await apiClient.delete(`/folders/${folderId}`, config); // Pass config with data
};



// --- End API Functions ---