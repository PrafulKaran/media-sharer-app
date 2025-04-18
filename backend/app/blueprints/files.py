# backend/app/blueprints/files.py
from flask import Blueprint, jsonify, session # Import session
from app.services import file_service, folder_service # Import folder_service

files_bp = Blueprint('files', __name__, url_prefix='/api/files')

# --- DELETE SINGLE FILE (Check Session) ---
@files_bp.route('/<int:file_id>', methods=['DELETE'])
def delete_single_file_route(file_id):
    print(f"ROUTE: DELETE /api/files/{file_id}")
    try:
        metadata = file_service.get_file_metadata(file_id)
        if not metadata: return jsonify({"error": "File not found"}), 404
        storage_path = metadata.get('storage_path')
        folder_id = metadata.get('folder_id')
        if not storage_path: return jsonify({"error": "File metadata missing storage path"}), 500

        # --- Session Check ---
        if folder_id:
             folder_details = folder_service.get_folder_by_id(folder_id)
             if folder_details and folder_details.get('is_protected'):
                 if session.get('verified_folder_id') != folder_id:
                     return jsonify({"error": "Password verification required"}), 401 # Unauthorized
        # --- End Session Check ---

        file_service.delete_file_from_storage(storage_path) # Raises on error
        file_service.delete_file_metadata(file_id) # Raises on error
        session.modified = True # Refresh session
        return '', 204
    except ConnectionError as ce: return jsonify({"error": str(ce)}), 503
    except ValueError as ve: return jsonify({"error": str(ve)}), 500
    except Exception as e: print(f"Unhandled Exception: {e}"); return jsonify({"error": "Internal server error"}), 500

# --- GET FILE SIGNED URL (Check Session) ---
@files_bp.route('/<int:file_id>/signed-url', methods=['GET'])
def get_file_signed_url_route(file_id):
    print(f"ROUTE: GET /api/files/{file_id}/signed-url")
    try:
        metadata = file_service.get_file_metadata(file_id)
        if not metadata: return jsonify({"error": "File not found"}), 404
        storage_path = metadata.get('storage_path')
        folder_id = metadata.get('folder_id')
        if not storage_path: return jsonify({"error": "File metadata missing storage path"}), 500

        # --- Session Check ---
        if folder_id:
             folder_details = folder_service.get_folder_by_id(folder_id)
             if folder_details and folder_details.get('is_protected'):
                 if session.get('verified_folder_id') != folder_id:
                     return jsonify({"error": "Password verification required"}), 401 # Unauthorized
        # --- End Session Check ---

        signed_url = file_service.create_signed_url(storage_path) # Uses default expiry
        session.modified = True # Refresh session
        return jsonify({"signedUrl": signed_url}), 200
    except ValueError as ve: return jsonify({"error": str(ve)}), 500
    except ConnectionError as ce: return jsonify({"error": str(ce)}), 503
    except Exception as e: print(f"Unhandled Exception: {e}"); return jsonify({"error": "Internal server error"}), 500