# backend/app/__init__.py
import os
from flask import Flask, jsonify, session # Import session
from flask_cors import CORS
from datetime import timedelta # Import timedelta for session lifetime

# Import Blueprints
from .blueprints.folders import folders_bp
from .blueprints.files import files_bp

# Import Supabase client getter (optional for test routes below)
from .services.supabase_client import get_supabase_client

def create_app():
    """Application Factory Function"""
    app = Flask(__name__)

    # --- Session Configuration ---
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    if not app.config['SECRET_KEY']:
        print("\n" + "*"*80)
        print("*\tCRITICAL WARNING: SECRET_KEY environment variable not set!")
        print("*\tFlask sessions require a secret key for security.")
        print("*\tGenerate one using: python -c \"import secrets; print(secrets.token_hex(24))\"")
        print("*\tAdd it to your .env file as SECRET_KEY='your_generated_key'")
        print("*\tUsing a default insecure key for now (DEVELOPMENT ONLY).")
        print("*"*80 + "\n")
        app.config['SECRET_KEY'] = 'dev-insecure-secret-key-replace-me-immediately' # Insecure default

    # Set session lifetime (e.g., 10 minutes of inactivity)
    session_lifetime_minutes = int(os.environ.get('SESSION_LIFETIME_MINUTES', '10'))
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=session_lifetime_minutes)
    app.config['SESSION_PERMANENT'] = True # Use the lifetime timeout
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax' # Recommended setting
    app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true' # Set True if deployed via HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True # Prevent client JS access

    print(f"Session lifetime set to: {app.config['PERMANENT_SESSION_LIFETIME']}")
    print(f"Session cookie secure: {app.config['SESSION_COOKIE_SECURE']}")
    # --- End Session Configuration ---


    # --- CORS Configuration ---
    frontend_origin = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    print(f"Configuring CORS for origin: {frontend_origin}")
    # MUST support credentials for session cookies to work
    CORS(app, resources={r"/api/*": {"origins": frontend_origin}}, supports_credentials=True)


    # --- Register Blueprints ---
    app.register_blueprint(folders_bp)
    app.register_blueprint(files_bp)
    print("Registered folders blueprint at /api/folders")
    print("Registered files blueprint at /api/files")


    # --- Test/Basic Routes ---
    @app.route('/api/ping')
    def ping_pong():
        print("'/api/ping' endpoint called (App level)")
        # You can check session here for debugging if needed
        # print(f"Session data: {session}")
        return jsonify(message="pong")

    @app.route('/api/test-db')
    def test_db_connection():
        # ... (This function remains unchanged from previous complete version) ...
        print("'/api/test-db' endpoint called (App level)")
        supabase = get_supabase_client()
        if not supabase:
            return jsonify(status="Error", message="Supabase client not initialized."), 500
        try:
            response = supabase.table('folders').select('id').limit(1).execute()
            if hasattr(response, 'error') and response.error:
                error_details = { "message": response.error.message, "code": response.error.code, "details": response.error.details, "hint": response.error.hint }
                if response.error.code == '42P01':
                     return jsonify(status="Error", message="Database Error: 'folders' table does not exist.", error_details=error_details), 500
                else:
                     return jsonify(status="Error", message=f"Could not query 'folders' table.", error_details=error_details), 500
            else:
                 return jsonify(status="Success", message="Connected to Supabase and queried 'folders' table."), 200
        except Exception as e:
            error_message = str(e); return jsonify(status="Error", message=f"Exception during DB test: {error_message}"), 500


    print("Flask app created successfully.")
    return app