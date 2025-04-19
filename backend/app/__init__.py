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

    # --- Determine Environment ---
    # Use FLASK_ENV, default to 'development'
    # Render typically sets NODE_ENV=production, which we can check as a fallback
    flask_env = os.environ.get('FLASK_ENV', 'development')
    is_production = flask_env == 'production' or os.environ.get('NODE_ENV') == 'production'
    app.config['FLASK_ENV'] = 'production' if is_production else 'development'
    app.config['DEBUG'] = not is_production # Debug is False in production

    # --- Session Configuration ---
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
    if not app.config['SECRET_KEY']:
        print("\n" + "*"*80); print("*\tCRITICAL WARNING: SECRET_KEY environment variable not set!"); # Multi-line print for emphasis
        print("*\tUsing default insecure key for DEVELOPMENT ONLY."); print("*"*80 + "\n")
        if is_production: raise ValueError("SECRET_KEY environment variable is required for production.")
        app.config['SECRET_KEY'] = 'dev-insecure-secret-key-needs-changing' # Default for local dev ONLY

    # Session Lifetime
    session_lifetime_minutes = int(os.environ.get('SESSION_LIFETIME_MINUTES', '10')) # Default: 10 minutes
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=session_lifetime_minutes)
    app.config['SESSION_PERMANENT'] = True

    # --- Cookie Security Settings (Crucial for Cross-Site Render <-> Vercel) ---

    # 1. SESSION_COOKIE_SECURE: MUST be True in production (HTTPS)
    #    Render deploys services with HTTPS by default. Assume True in production.
    #    Can be overridden by environment variable if needed (e.g., APP_IS_HTTPS=false for local HTTPS tests)
    app.config['SESSION_COOKIE_SECURE'] = os.environ.get('APP_IS_HTTPS', 'true' if is_production else 'false').lower() == 'true'

    # 2. SESSION_COOKIE_SAMESITE: MUST be 'None' for cross-site cookie sending (Vercel <-> Render)
    #    Using 'None' REQUIRES Secure=True.
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'

    # 3. SESSION_COOKIE_HTTPONLY: Keep True (prevents JS access)
    app.config['SESSION_COOKIE_HTTPONLY'] = True

    # --- End Cookie Security Settings ---

    # Log final effective settings
    print(f"--- App Config ---")
    print(f"Flask Env: {app.config['FLASK_ENV']}")
    print(f"Debug Mode: {app.config['DEBUG']}")
    print(f"Session Lifetime: {app.config['PERMANENT_SESSION_LIFETIME']}")
    print(f"Session Cookie Secure: {app.config['SESSION_COOKIE_SECURE']}")
    print(f"Session Cookie HttpOnly: {app.config['SESSION_COOKIE_HTTPONLY']}")
    print(f"Session Cookie SameSite: {app.config['SESSION_COOKIE_SAMESITE']}")
    print(f"--- End App Config ---")

    # Raise error immediately if SameSite=None but Secure=False (invalid combination)
    if app.config['SESSION_COOKIE_SAMESITE'] == 'None' and not app.config['SESSION_COOKIE_SECURE']:
        raise ValueError("Invalid session configuration: SESSION_COOKIE_SAMESITE='None' requires SESSION_COOKIE_SECURE=True (HTTPS).")

    # --- CORS Configuration ---
    # Read allowed frontend origin from environment variable
    frontend_origin = os.environ.get("FRONTEND_URL", "http://localhost:5173") # Default for local dev
    print(f"Configuring CORS for origin: {frontend_origin}")
    # Ensure supports_credentials=True is set for cookies/sessions
    CORS(app, resources={r"/api/*": {"origins": frontend_origin}}, supports_credentials=True)


    # --- Register Blueprints ---
    app.register_blueprint(folders_bp)
    app.register_blueprint(files_bp)
    print("Registered folders blueprint at /api/folders")
    print("Registered files blueprint at /api/files")


    # --- Test/Basic Routes (Conditional) ---
    if not is_production: # Only register debug/test routes if not in production
        print("Registering development/test routes.")
        @app.route('/api/ping')
        def ping_pong():
            print("'/api/ping' endpoint called (App level)")
            return jsonify(message="pong-debug")

        @app.route('/api/test-db')
        def test_db_connection():
            print("'/api/test-db' endpoint called (App level)")
            supabase = get_supabase_client()
            if not supabase: return jsonify(status="Error", message="Client not initialized"), 500
            try:
                response = supabase.table('folders').select('id', count='exact').limit(1).execute()
                if hasattr(response, 'error') and response.error: return jsonify(status="Error", message=f"DB Error {response.error.code}"), 500
                else: count = getattr(response, 'count', '?'); return jsonify(status="Success", message=f"DB connection OK ({count})"), 200
            except Exception as e: return jsonify(status="Error", message=f"Exception: {e}"), 500


    print("Flask app instance created successfully.")
    return app # Return the configured app instance