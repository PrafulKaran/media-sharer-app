# backend/app/blueprints/files.py
from flask import Blueprint, jsonify, session # Import session
# Import BOTH file_service and folder_service
from app.services import file_service, folder_service

# Create a Blueprint instance specifically for file operations
# All routes here will be prefixed with /api/files
files_bp = Blueprint('files', __name__, url_prefix='/api/files')


# --- DELETE SINGLE FILE (Added Session Check) ---
@files_bp.route('/<int:file_id>', methods=['DELETE'])
def delete_single_file_route(file_id):
    """Route to delete a specific file, checking parent folder session if protected."""
    print(f"ROUTE: DELETE /api/files/{file_id}")
    storage_path = None
    folder_id = None # Variable to store folder_id

    try:
        # 1. Get metadata (includes folder_id and storage_path)
        # Service function will raise ConnectionError if DB fails
        metadata = file_service.get_file_metadata(file_id)
        if not metadata:
            # If service returns None, file wasn't found
            return jsonify({"error": "File not found"}), 404

        storage_path = metadata.get('storage_path')
        folder_id = metadata.get('folder_id') # Get the parent folder ID from metadata

        # Check if storage path is present (should be due to DB constraints)
        if not storage_path:
            print(f"CRITICAL Error: File metadata {file_id} missing storage path!")
            return jsonify({"error": "File metadata inconsistent"}), 500

        # --- ADDED SESSION CHECK based on parent folder ---
        if folder_id: # Only proceed if folder_id was retrieved
             # Fetch parent folder details (service handles not found)
             folder_details = folder_service.get_folder_by_id(folder_id)
             # Check if parent folder exists AND is protected
             if folder_details and folder_details.get('is_protected'):
                 print(f"Parent folder {folder_id} is protected. Checking session for delete action on file {file_id}.")
                 # Compare session variable with the file's parent folder ID
                 if session.get('verified_folder_id') != folder_id:
                     print(f"Session invalid for deleting file in folder {folder_id}.")
                     return jsonify({"error": "Password verification required for parent folder to delete this file"}), 401 # Unauthorized
                 print(f"Session verified for deleting file in folder {folder_id}.")
             elif not folder_details:
                 # File belongs to a folder that no longer exists in DB
                 print(f"Warning: Parent folder {folder_id} not found for file {file_id} during delete.")
                 # Decide how to handle - let's allow deleting the orphaned file metadata/storage for now
             # else: Folder exists but is not protected - no session check needed
        else:
             # File metadata doesn't have a folder_id - potentially an issue
             print(f"Warning: File {file_id} does not have a parent folder ID associated.")
             # Allow deletion for now, but might indicate data integrity problem
        # --- END SESSION CHECK ---

        # 2. Delete from storage (service raises ConnectionError on failure)
        print(f"Attempting storage deletion for path: {storage_path}")
        file_service.delete_file_from_storage(storage_path)

        # 3. Delete from DB (service raises ConnectionError on failure)
        print(f"Attempting metadata deletion for file ID: {file_id}")
        file_service.delete_file_metadata(file_id)

        # If we reach here, both storage and DB deletion were successful
        session.modified = True # Refresh session timeout on successful activity
        print(f"File {file_id} deleted successfully (storage and DB).")
        return '', 204 # Success - No Content

    except ConnectionError as ce:
         # Handle errors raised from service functions (DB or Storage)
         print(f"Connection Error during file deletion process for {file_id}: {ce}")
         return jsonify({"error": str(ce)}), 503 # Service Unavailable or specific error
    except ValueError as ve:
        # Handle errors like missing storage path if raised by service
         print(f"Value Error deleting file {file_id}: {ve}")
         return jsonify({"error": str(ve)}), 500 # Treat as internal error
    except Exception as e:
        # Catch any other unexpected errors
        print(f"Unhandled Exception deleting file {file_id}: {e}")
        return jsonify({"error": "An internal server error occurred during deletion"}), 500


# --- GET FILE SIGNED URL (Added Session Check) ---
@files_bp.route('/<int:file_id>/signed-url', methods=['GET'])
def get_file_signed_url_route(file_id):
    """Route to get a signed URL for a file, checking parent folder session if protected."""
    print(f"ROUTE: GET /api/files/{file_id}/signed-url")
    try:
        # 1. Get metadata (includes folder_id and storage_path)
        metadata = file_service.get_file_metadata(file_id)
        if not metadata: return jsonify({"error": "File not found"}), 404
        storage_path = metadata.get('storage_path')
        folder_id = metadata.get('folder_id')
        if not storage_path: return jsonify({"error": "File metadata missing storage path"}), 500

        # --- ADDED SESSION CHECK based on parent folder ---
        if folder_id:
             folder_details = folder_service.get_folder_by_id(folder_id)
             if folder_details and folder_details.get('is_protected'):
                 print(f"Parent folder {folder_id} is protected. Checking session for URL generation for file {file_id}.")
                 if session.get('verified_folder_id') != folder_id:
                     print(f"Session invalid for getting URL in folder {folder_id}.")
                     return jsonify({"error": "Password verification required for parent folder to view this file"}), 401 # Unauthorized
                 print(f"Session verified for getting URL in folder {folder_id}.")
             elif not folder_details:
                  print(f"Warning: Parent folder {folder_id} not found for file {file_id} during URL generation.")
                  # Allow generating URL for now? Or return error? Let's allow.
        else:
            print(f"Warning: File {file_id} does not have a parent folder ID associated.")
        # --- END SESSION CHECK ---

        # 2. Generate signed URL via service (uses default expiry)
        signed_url = file_service.create_signed_url(storage_path)
        session.modified = True # Refresh session timeout on successful activity
        print(f"Signed URL generated for file {file_id}.")
        return jsonify({"signedUrl": signed_url}), 200

    except ValueError as ve: # e.g., missing path from service
        print(f"Value Error getting URL {file_id}: {ve}")
        return jsonify({"error": str(ve)}), 500
    except ConnectionError as ce: # Error from Supabase client during URL generation
         print(f"Connection Error getting URL {file_id}: {ce}")
         return jsonify({"error": str(ce)}), 503
    except Exception as e:
        print(f"Unhandled Exception getting URL {file_id}: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500