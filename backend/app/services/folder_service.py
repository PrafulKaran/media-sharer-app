# backend/app/services/folder_service.py
import bcrypt
from .supabase_client import get_supabase_client
from . import file_service # Use relative import within package

# --- Folder Creation ---
def create_new_folder(name, password=None):
    """Creates a new folder record in the database."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")
    hashed_password = None
    if password:
        try: salt = bcrypt.gensalt(); hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        except Exception as e: print(f"Error hashing password: {e}"); raise ValueError("Failed to process password") from e
    folder_data = {'name': name.strip(), 'password_hash': hashed_password}
    try:
        response = supabase.table('folders').insert(folder_data).execute()
        if hasattr(response, 'error') and response.error:
            if 'duplicate key' in response.error.message: raise ValueError(f"Folder name '{name}' already exists.")
            else: raise ConnectionError(f"DB error creating folder: {response.error.message}")
        if hasattr(response, 'data') and response.data:
            new_folder = response.data[0]; return {k: v for k, v in new_folder.items() if k != 'password_hash'}
        else: raise ConnectionError("Folder created but failed to retrieve data.")
    except Exception as e: print(f"Exception in create_new_folder: {e}"); raise


# --- List All Folders ---
def get_all_folders():
    """Retrieves all folders, adding 'is_protected' flag."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")
    try:
        # Select the password_hash along with other fields
        response = supabase.table('folders').select(
            'id, name, created_at, password_hash' # <-- Select hash
            ).order(
                'created_at', desc=True
            ).execute()

        if hasattr(response, 'error') and response.error:
            raise ConnectionError(f"Database error listing folders: {response.error.message}")

        # Process the data to add the flag and remove the hash
        folders_with_status = []
        if response.data:
            for folder in response.data:
                is_protected = folder.get('password_hash') is not None
                # Create a new dict excluding the hash and adding the flag
                safe_folder_data = {
                    'id': folder.get('id'),
                    'name': folder.get('name'),
                    'created_at': folder.get('created_at'),
                    'is_protected': is_protected # <-- Add the flag
                }
                folders_with_status.append(safe_folder_data)

        return folders_with_status # Return the processed list

    except Exception as e: print(f"Exception in get_all_folders: {e}"); raise



# --- Get Single Folder Details (including protection status) ---
def get_folder_by_id(folder_id):
    """Retrieves details for a single folder, adding 'is_protected' flag."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")
    try:
        response = supabase.table('folders').select('id, name, created_at, password_hash').eq('id', folder_id).maybe_single().execute()
        if hasattr(response, 'error') and response.error: raise ConnectionError(f"DB error getting folder {folder_id}: {response.error.message}")
        if response.data:
            folder_data = response.data
            is_protected = folder_data.get('password_hash') is not None
            folder_data_safe = {k: v for k, v in folder_data.items() if k != 'password_hash'}
            folder_data_safe['is_protected'] = is_protected # Add the flag
            return folder_data_safe
        else: return None # Not found
    except Exception as e: print(f"Exception in get_folder_by_id for {folder_id}: {e}"); raise

# --- Verify Folder Password ---
def verify_folder_password(folder_id, provided_password):
    """Checks if the provided password matches the stored hash for a folder."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")
    if not provided_password: return False
    try:
        response = supabase.table('folders').select('password_hash').eq('id', folder_id).maybe_single().execute()
        if hasattr(response, 'error') and response.error: print(f"DB error fetching hash: {response.error.message}"); return False
        if response.data and response.data.get('password_hash'):
            stored_hash = response.data['password_hash']
            # Compare using bcrypt
            return bcrypt.checkpw(provided_password.encode('utf-8'), stored_hash.encode('utf-8'))
        else: return False # No folder or no password set
    except Exception as e: print(f"Exception verifying password: {e}"); return False

# --- Check Folder Existence ---
def check_folder_exists(folder_id):
    """Quickly checks if a folder exists by ID."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")
    try:
        response = supabase.table('folders').select('id', count='exact').eq('id', folder_id).execute() # Use count
        # Check for errors and if count is greater than 0
        if hasattr(response, 'error') and response.error: print(f"Error checking folder: {response.error.message}"); return False
        return response.count > 0
    except Exception as e: print(f"Exception checking folder: {e}"); return False

   

# --- NEW FUNCTION: Delete Folder and Contents ---
def delete_folder_and_contents(folder_id):
    """Deletes a folder and all its associated files from storage and DB."""
    supabase = get_supabase_client()
    if not supabase: raise ConnectionError("Supabase client not initialized.")

    print(f"Initiating deletion for folder ID: {folder_id}")

    # 1. List files within the folder to get storage paths
    try:
        print("Listing files to delete from storage...")
        files_in_folder = file_service.list_files_in_folder(folder_id) # Assumes this doesn't need password check here
        storage_paths_to_delete = [f['storage_path'] for f in files_in_folder if f.get('storage_path')]
        print(f"Found {len(storage_paths_to_delete)} file(s) in storage to delete.")
    except Exception as e:
        # If listing fails, we can't reliably delete storage items. Abort.
        print(f"Error listing files for folder {folder_id} before deletion: {e}")
        raise ConnectionError(f"Could not list files to delete for folder {folder_id}. Aborting delete.") from e

    # 2. Delete files from storage (if any exist)
    if storage_paths_to_delete:
        try:
            file_service.delete_multiple_files_from_storage(storage_paths_to_delete)
            print("Storage deletion step completed (or attempted).")
        except ConnectionError as e:
            # Decide how to handle partial storage deletion failure.
            # Option 1: Abort folder deletion entirely (safer?)
            print(f"Storage deletion failed for folder {folder_id}. Aborting folder DB deletion.")
            raise ConnectionError(f"Failed to delete all files from storage for folder {folder_id}.") from e
            # Option 2: Log error and proceed to delete folder record anyway (might leave orphaned files)
            # print(f"!!! WARNING: Storage deletion failed for folder {folder_id}, but proceeding to delete folder record: {e}")


    # 3. Delete the folder record from the database
    # The CASCADE constraint should handle deleting associated rows in the 'files' table.
    try:
        print(f"Attempting to delete folder record for ID: {folder_id}")
        response = supabase.table('folders').delete().eq('id', folder_id).execute()

        if hasattr(response, 'error') and response.error:
             raise ConnectionError(f"DB error deleting folder {folder_id}: {response.error.message}")
        # Check if deletion affected rows (optional, response data might be empty)
        print(f"Folder record {folder_id} deleted successfully.")

    except Exception as e:
        print(f"Exception deleting folder record {folder_id}: {e}")
        raise # Re-raise DB error

    # If we reach here, all steps succeeded (or storage deletion failed but we proceeded)
    print(f"Folder {folder_id} and its contents deletion process finished.")