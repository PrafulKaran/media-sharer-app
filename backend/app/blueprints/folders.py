# backend/app/blueprints/folders.py
from flask import Blueprint, request, jsonify, session # Import session
from app.services import folder_service, file_service


folders_bp = Blueprint('folders', __name__, url_prefix='/api/folders')

# --- CREATE FOLDER ---
@folders_bp.route('', methods=['POST'])
def create_folder_route():
    print("ROUTE: POST /api/folders")
    try:
        data = request.get_json()
        if not data: return jsonify({"error": "Request body must be JSON"}), 400
        name = data.get('name'); password = data.get('password')
        if not name or len(name.strip()) == 0: raise ValueError("Folder name is required")
        new_folder = folder_service.create_new_folder(name, password); return jsonify(new_folder), 201
    except ValueError as ve: status_code = 409 if "exists" in str(ve) else 400; print(f"Validation Error: {ve} -> Status {status_code}"); return jsonify({"error": str(ve)}), status_code
    except ConnectionError as ce: print(f"Connection/Service Error: {ce}"); return jsonify({"error": str(ce)}), 503
    except Exception as e: print(f"Unhandled Exception: {e}"); return jsonify({"error": "Internal server error"}), 500

# --- LIST ALL FOLDERS ---
@folders_bp.route('', methods=['GET'])
def get_folders_route():
    # ... (Code remains the same) ...
    print("ROUTE: GET /api/folders")
    try: folders = folder_service.get_all_folders(); return jsonify(folders), 200
    except ConnectionError as ce: return jsonify({"error": str(ce)}), 503
    except Exception as e: print(f"Unhandled Exception: {e}"); return jsonify({"error": "Internal server error"}), 500

# --- GET SINGLE FOLDER DETAILS ---
@folders_bp.route('/<int:folder_id>', methods=['GET'])
def get_folder_details_route(folder_id):
    print(f"ROUTE: GET /api/folders/{folder_id}")
    try:
        # Call service function which includes 'is_protected' flag
        folder_details = folder_service.get_folder_by_id(folder_id)
        if folder_details:
            return jsonify(folder_details), 200
        else:
            # Folder not found by service
            return jsonify({"error": f"Folder with ID {folder_id} not found"}), 404
    except ConnectionError as ce:
        # Handle specific DB connection/query errors from service
        print(f"Connection error fetching folder details {folder_id}: {ce}")
        return jsonify({"error": f"Database error: {str(ce)}"}), 503 # Service Unavailable
    except Exception as e:
        # Catch any other unexpected errors
        print(f"Unhandled Exception getting folder details {folder_id}: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- VERIFY PASSWORD AND SET SESSION ---
@folders_bp.route('/<int:folder_id>/verify-password', methods=['POST'])
def verify_folder_password_route(folder_id):
    print(f"ROUTE: POST /api/folders/{folder_id}/verify-password")
    try:
        # Ensure request body is valid JSON and contains 'password'
        data = request.get_json()
        if not data: return jsonify({"error": "Request body must be JSON"}), 400
        provided_password = data.get('password')
        if not provided_password: return jsonify({"error": "Password is required in JSON body"}), 400

        # Call service to check password (returns True/False)
        is_correct = folder_service.verify_folder_password(folder_id, provided_password)

        if is_correct:
            # Password matches, set session variables
            session.permanent = True # Use the configured lifetime
            session['verified_folder_id'] = folder_id # Store ID for verification
            print(f"Password verified for folder {folder_id}. Session set.")
            return jsonify({"message": "Password verified"}), 200 # OK
        else:
            # Password incorrect
            print(f"Password verification failed for folder {folder_id}.")
            return jsonify({"error": "Incorrect password"}), 403 # Forbidden

    except ConnectionError as ce:
        # Handle DB errors during verification (e.g., fetching hash)
        print(f"Connection error during password verification for {folder_id}: {ce}")
        return jsonify({"error": f"Database error during verification: {str(ce)}"}), 503
    except Exception as e:
        # Catch any other unexpected errors
        print(f"Unhandled Exception verifying password for {folder_id}: {e}")
        return jsonify({"error": "An internal server error occurred during verification"}), 500


# --- COMBINED ROUTE for Files within a Folder (GET/POST) ---
@folders_bp.route('/<int:folder_id>/files', methods=['GET', 'POST'])
def handle_folder_files(folder_id):
    """Handles listing files (GET) or uploading a file (POST) for a folder."""

    # --- Perform Initial Checks WITHOUT outer try/except ---
    # These checks will return early if there's an issue.
    try:
        folder_details = folder_service.get_folder_by_id(folder_id)
        if not folder_details:
             print(f"Access Check Failed: Folder {folder_id} not found")
             return jsonify({"error": f"Folder {folder_id} not found"}), 404

        if folder_details.get('is_protected'):
            print(f"Folder {folder_id} protected. Check session.")
            if session.get('verified_folder_id') != folder_id:
                print(f"Session invalid for folder {folder_id}.")
                return jsonify({"error": "Password verification required"}), 401
            print(f"Session verified for folder {folder_id}.")
        else:
            print(f"Folder {folder_id} not protected.")

        # If checks passed, refresh session timeout BEFORE handling GET/POST
        session.modified = True

    except ConnectionError as ce:
        # Handle DB errors during the initial folder check
        print(f"Connection error during access check: {ce}")
        return jsonify({"error": str(ce)}), 503
    except Exception as e:
        # Catch unexpected errors during the initial checks
        print(f"Unhandled exception during access check: {e}")
        return jsonify({"error": "Internal server error during access check"}), 500
    # --- End Initial Checks ---


    # --- Handle GET Request (List Files) ---
    if request.method == 'GET':
        print(f"ROUTE: GET /api/folders/{folder_id}/files (Combined)")
        try:
            # Initial checks already passed, safe to list files
            files = file_service.list_files_in_folder(folder_id)
            return jsonify(files), 200
        except ConnectionError as ce: return jsonify({"error": str(ce)}), 503
        except Exception as e: print(f"Unhandled Exception: {e}"); return jsonify({"error": "Internal server error"}), 500

    # --- Handle POST Request (Upload File) ---
    elif request.method == 'POST':
        print(f"ROUTE: POST /api/folders/{folder_id}/files (Combined)")
        print(f"Request Headers: {request.headers}")
        print(f"Request Content Type: {request.content_type}")
        print(f"Request Files keys: {list(request.files.keys())}")
        try:
            # Initial checks passed. Now check file data.
            if 'file' not in request.files:
                print(">>> Check 1 FAILED: 'file' key not found in request.files <<<")
                return jsonify({"error": "No file part in the request"}), 400

            file_storage = request.files['file']
            print(f"FileStorage object received: {file_storage}")
            print(f"FileStorage filename: '{file_storage.filename}'")

            if file_storage.filename == '':
                print(">>> Check 2 FAILED: file.filename is empty <<<")
                return jsonify({"error": "No file selected"}), 400

            # If checks pass...
            print("File checks passed. Calling upload service...")
            file_metadata = file_service.upload_file_to_storage(file_storage, folder_id)
            return jsonify(file_metadata), 201

        except ValueError as ve: return jsonify({"error": str(ve)}), 400
        except ConnectionError as ce: return jsonify({"error": str(ce)}), 503
        except Exception as e: print(f"Unhandled Exception: {e}"); return jsonify({"error": "Internal server error"}), 500

    # Fallback
    else:
         return jsonify({"error": "Method Not Allowed"}), 405
    


# --- MODIFY: DELETE FOLDER Route (Add Password Check) ---
@folders_bp.route('/<int:folder_id>', methods=['DELETE'])
def delete_folder_route(folder_id):
    """Route to delete a folder and its contents, requires password if protected."""
    print(f"ROUTE: DELETE /api/folders/{folder_id}")

    try:
        # 1. Check if folder exists and if it's protected
        folder_details = folder_service.get_folder_by_id(folder_id)
        if not folder_details:
            return jsonify({"error":"Folder not found"}), 404

        # 2. If protected, verify password from request body
        if folder_details.get('is_protected'):
            print(f"Folder {folder_id} is protected. Verifying password for deletion.")
            data = request.get_json() # Password expected in body for DELETE
            if not data or 'password' not in data:
                return jsonify({"error": "Password required in request body to delete this folder"}), 400 # Bad Request

            provided_password = data['password']
            if not folder_service.verify_folder_password(folder_id, provided_password):
                print(f"Incorrect password provided for deleting folder {folder_id}.")
                return jsonify({"error": "Incorrect password"}), 403 # Forbidden

            print(f"Password verified for deleting folder {folder_id}.")
        else:
            print(f"Folder {folder_id} is not protected. No password needed for deletion.")

        # 3. If password OK or not needed, proceed with deletion via service
        folder_service.delete_folder_and_contents(folder_id)

        # Clear session variable if it matches the deleted folder (optional cleanup)
        if 'verified_folder_id' in session and session['verified_folder_id'] == folder_id:
             session.pop('verified_folder_id', None)
             print(f"Cleared session verification for deleted folder {folder_id}.")

        print(f"Folder {folder_id} deletion process completed successfully via route.")
        return '', 204 # No Content on success

    except ConnectionError as ce:
         print(f"Error during folder deletion process for {folder_id}: {ce}")
         return jsonify({"error": str(ce)}), 503
    except Exception as e:
        print(f"Unhandled Exception deleting folder {folder_id}: {e}")
        return jsonify({"error": "An internal server error occurred during folder deletion"}), 500

# ... (handle_folder_files route) ...