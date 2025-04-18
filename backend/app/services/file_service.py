# backend/app/services/file_service.py
import os
import uuid
from werkzeug.utils import secure_filename
from .supabase_client import get_supabase_client
# Import specific exceptions if Supabase client library provides them
# from supabase.lib.errors import StorageApiError # Example

STORAGE_BUCKET_NAME = 'media-files' # Define as constant for consistency

# --- List Files (Password check happens *before* this is called) ---
def list_files_in_folder(folder_id):
    """Retrieves metadata for all files within a specific folder."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")

    try:
        # Select relevant columns for listing
        response = supabase.table('files').select(
            'id, name, mime_type, size, uploaded_at, storage_path' # Include path for potential use
        ).eq('folder_id', folder_id).order('name', desc=False).execute() # Order alphabetically

        # Check for Supabase errors during the query
        if hasattr(response, 'error') and response.error:
            raise ConnectionError(f"Database error listing files: {response.error.message}")

        # Return the list of files (or an empty list if none found)
        return response.data or []
    except Exception as e:
        # Catch any other potential exceptions
        print(f"Exception in list_files_in_folder for folder_id {folder_id}: {e}")
        # Re-raise the exception to be handled by the calling route
        raise

# --- Get Single File Metadata ---
def get_file_metadata(file_id):
    """Retrieves metadata for a single file by its ID."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")

    try:
        # Select columns needed to identify the file and its storage location
        response = supabase.table('files').select(
            'id, name, storage_path, folder_id' # Include folder_id if needed for auth checks later
            ).eq(
                'id', file_id
            ).maybe_single().execute() # Use maybe_single for fetching one record or None

        # Check for Supabase errors
        if hasattr(response, 'error') and response.error:
            raise ConnectionError(f"DB error fetching file metadata for ID {file_id}: {response.error.message}")

        # Return the dictionary object if found, otherwise None
        return response.data
    except Exception as e:
         print(f"Exception getting file metadata for {file_id}: {e}")
         raise

# --- Upload File ---
def upload_file_to_storage(file_storage, folder_id):
    """Handles file naming, uploads to storage, and inserts metadata."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")

    # Validate input FileStorage object
    if not file_storage or file_storage.filename == '':
        raise ValueError("Invalid file provided for upload.")

    # --- File Naming & Path ---
    original_filename = secure_filename(file_storage.filename) # Sanitize original name
    unique_id = uuid.uuid4() # Generate unique ID
    _root, extension = os.path.splitext(original_filename)
    extension = extension if extension else '' # Handle files without extension
    unique_filename = f"{unique_id}{extension}" # Create unique name
    storage_path = f"{folder_id}/{unique_filename}" # Path within the bucket (e.g., "123/uuid.jpg")

    # --- Get File Data & Metadata ---
    mime_type = file_storage.mimetype
    file_storage.seek(0) # Ensure stream is at the beginning before reading
    file_bytes = file_storage.read() # Read file content into memory as bytes
    file_size = len(file_bytes) # Get accurate size from bytes

    print(f"Uploading {original_filename} ({mime_type}, {file_size} bytes) to storage path: {storage_path}")

    # --- Upload to Storage ---
    try:
        # Use storage client to upload bytes
        upload_response = supabase.storage.from_(STORAGE_BUCKET_NAME).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": mime_type} # Provide content type
        )
        print(f"Supabase Storage upload response: {upload_response}") # Log response for debugging
        # Add specific error checks based on upload_response if needed
    except Exception as e:
        print(f"Storage upload failed: {e}")
        # Raise a specific error indicating storage failure
        raise ConnectionError(f"Storage upload failed: {str(e)}") from e

    # --- Insert into DB ---
    db_record = None
    try:
        # Prepare metadata for database insertion
        file_metadata = {
            'name': original_filename, # Store original name
            'folder_id': folder_id,
            'storage_path': storage_path, # Store unique storage path
            'mime_type': mime_type,
            'size': file_size
        }
        print(f"Inserting file metadata: {file_metadata}")
        # Execute insert query
        response = supabase.table('files').insert(file_metadata).execute()

        # Check DB insert response for errors
        if hasattr(response, 'error') and response.error:
            raise ConnectionError(f"DB insert failed: {response.error.message}")
        # Check if data was returned (expected)
        if not (hasattr(response, 'data') and response.data):
             raise ConnectionError("DB insert succeeded but returned no confirmation data.")

        # Store the created record and return it
        db_record = response.data[0]
        print(f"Successfully saved file metadata: {db_record}")
        return db_record

    except Exception as e:
        # If DB insert fails AFTER successful storage upload, attempt cleanup
        print(f"DB insert failed after successful storage upload: {e}")
        try:
            print(f"Attempting cleanup: Removing {storage_path} from storage...")
            # Call storage deletion service function
            delete_file_from_storage(storage_path) # Use the dedicated function now
            print("Storage cleanup successful.")
        except Exception as cleanup_e:
            # Log if cleanup fails - manual intervention might be needed
            print(f"!!! Storage cleanup FAILED: {cleanup_e}. Orphaned file exists at {storage_path}")
        # Re-raise the original DB error that caused the failure
        raise ConnectionError(f"Failed to save file metadata: {str(e)}") from e


# --- Delete File from Storage ---
def delete_file_from_storage(storage_path):
    """Deletes a file object from the storage bucket using its path."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")
    if not storage_path: raise ValueError("Storage path is required for deletion.")

    try:
        print(f"Attempting to delete from Storage bucket '{STORAGE_BUCKET_NAME}' at path: {storage_path}")
        # Supabase remove method expects a list of paths
        response = supabase.storage.from_(STORAGE_BUCKET_NAME).remove([storage_path])
        print(f"Storage deletion response: {response}")
        # Basic check: Assume success if no exception. Add specific checks if needed.
    except Exception as e:
        print(f"Storage deletion failed for {storage_path}: {e}")
        # Raise error to indicate storage deletion failed
        raise ConnectionError(f"Storage deletion failed for path '{storage_path}': {str(e)}") from e
    

# --- NEW FUNCTION: Delete Multiple Files from Storage ---
def delete_multiple_files_from_storage(storage_paths):
    """Deletes multiple file objects from the storage bucket given a list of paths."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")
    if not storage_paths: # If list is empty or None, nothing to do
        print("No storage paths provided for deletion.")
        return [] # Indicate nothing was attempted/deleted

    # Ensure it's a list, even if only one path was passed somehow
    if not isinstance(storage_paths, list):
        storage_paths = [storage_paths]

    print(f"Attempting to delete {len(storage_paths)} file(s) from Storage bucket '{STORAGE_BUCKET_NAME}'")
    print(f"Paths: {storage_paths}")

    try:
        # Supabase remove method expects a list of paths
        response = supabase.storage.from_(STORAGE_BUCKET_NAME).remove(storage_paths)
        print(f"Storage multi-deletion response: {response}")
        # The response usually contains a list of dicts for each file attempt,
        # some might succeed, some might fail (e.g., file not found).
        # We should probably check this response for errors.
        errors = []
        if isinstance(response, list):
            for item in response:
                if isinstance(item, dict) and item.get('error'):
                     errors.append(item.get('message', 'Unknown storage deletion error'))

        if errors:
            # Raise an error summarizing the failed deletions
            raise ConnectionError(f"Storage deletion failed for some paths: {'; '.join(errors)}")

        # If no errors found in response (or response format is different), assume success if no exception
        print("Storage multi-deletion executed.")
        return response # Return the original response for potential inspection

    except Exception as e:
        print(f"Exception during storage multi-deletion: {e}")
        # Raise error indicating storage deletion failed
        raise ConnectionError(f"Storage multi-deletion failed: {str(e)}") from e



# --- Delete File Metadata ---
def delete_file_metadata(file_id):
    """Deletes a file metadata record from the 'files' database table."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")

    try:
        print(f"Attempting to delete metadata from DB for file ID: {file_id}")
        # Execute delete query targeting the specific file ID
        response = supabase.table('files').delete().eq('id', file_id).execute()

        # Check for errors during DB deletion
        if hasattr(response, 'error') and response.error:
            raise ConnectionError(f"DB metadata deletion failed for ID {file_id}: {response.error.message}")

        # Check if any rows were affected (optional, response might indicate this)
        # print(f"DB delete response: {response}") # Log for details
        print(f"Metadata deleted successfully from DB for file ID: {file_id}")
    except Exception as e:
         print(f"Exception deleting file metadata for {file_id}: {e}")
         raise

# --- Create Signed URL ---
def create_signed_url(storage_path, expires_in=3600):
    """Generates a temporary signed URL for accessing a file in storage."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")
    if not storage_path: raise ValueError("Storage path is required to generate signed URL.")

    try:
        print(f"Generating signed URL for storage path: {storage_path}")
        # Generate URL using the storage client
        response = supabase.storage.from_(STORAGE_BUCKET_NAME).create_signed_url(
            path=storage_path,
            expires_in=expires_in # URL validity duration in seconds
        )
        # Check if the expected key 'signedURL' exists in the response
        if 'signedURL' in response:
            return response['signedURL']
        else:
            # If key missing, extract error from response or provide default
            error_message = response.get('error', 'Unknown error during signed URL generation')
            print(f"Error generating signed URL: {error_message}")
            raise ConnectionError(f"Failed to generate signed URL: {error_message}")
    except Exception as e:
         print(f"Exception generating signed URL for {storage_path}: {e}")
         raise